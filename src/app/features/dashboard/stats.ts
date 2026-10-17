import { PRIORITIES, Task, TaskPriority, TaskStatus, statusOf } from '../tasks/models/task.models';

/** Santé d'un ensemble de tâches : tient compte des tâches EN RETARD (date limite dépassée, pas terminées). */
export type Health = 'saine' | 'surveiller' | 'danger' | 'vide';

export type StatusCounts = Record<TaskStatus, number>;

export interface ProjectStat {
  projectId: number;
  name: string;
  total: number;
  counts: StatusCounts;
  /** % de tâches terminées (0 à 100). */
  completion: number;
  overdue: number;
  health: Health;
}

export interface Stats {
  total: number;
  counts: StatusCounts;
  completion: number;
  overdue: number;
  /** Tâches non terminées dont la date limite tombe dans les 7 prochains jours (aujourd'hui compris). */
  dueSoon: number;
  /** Tâches urgentes pas encore terminées. */
  urgentOpen: number;
  byPriority: Record<TaskPriority, number>;
  health: Health;
  projects: ProjectStat[];
  /** Prochaines échéances : tâches non terminées, la plus proche d'abord (les retards en tête). */
  upcoming: Task[];
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  a_faire: '#94a3b8',
  en_cours: '#2bbbd7',
  terminee: '#16a34a',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  basse: '#9ca3af',
  moyenne: '#3b82f6',
  haute: '#f59e0b',
  urgente: '#dc2626',
};

export const HEALTH_LABELS: Record<Health, string> = {
  saine: 'En bonne santé',
  surveiller: 'À surveiller',
  danger: 'En danger',
  vide: 'Pas encore de données',
};

const HEALTH_ORDER: Record<Health, number> = { danger: 0, surveiller: 1, saine: 2, vide: 3 };

/** Ajoute des jours à une date AAAA-MM-JJ (calcul en UTC : pas de piège de fuseau ni d'heure d'été). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours de `today` à `due` (négatif = dépassé). */
export function daysUntil(today: string, due: string): number {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function isLate(task: Task, today: string): boolean {
  return statusOf(task) !== 'terminee' && !!task.dueDate && task.dueDate < today;
}

/**
 * Règle de santé :
 *  - aucune tâche → « vide » ; aucun retard → « saine » ;
 *  - retards sur 25 % des tâches ou moins → « à surveiller » ; au-delà → « en danger ».
 */
export function healthOf(total: number, overdue: number): Health {
  if (total === 0) return 'vide';
  if (overdue === 0) return 'saine';
  return overdue / total <= 0.25 ? 'surveiller' : 'danger';
}

const emptyCounts = (): StatusCounts => ({ a_faire: 0, en_cours: 0, terminee: 0 });
const percent = (part: number, total: number): number => (total === 0 ? 0 : Math.round((part / total) * 100));

export function computeStats(tasks: Task[], projectNames: Map<number, string>, today: string): Stats {
  const counts = emptyCounts();
  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p.value, 0])) as Record<TaskPriority, number>;
  const perProject = new Map<number, { counts: StatusCounts; overdue: number }>();
  const soonLimit = addDaysIso(today, 7);
  let overdue = 0;
  let dueSoon = 0;
  let urgentOpen = 0;

  for (const task of tasks) {
    const status = statusOf(task);
    const late = isLate(task, today);
    counts[status]++;
    byPriority[task.priority]++;
    if (late) overdue++;
    if (status !== 'terminee') {
      if (task.priority === 'urgente') urgentOpen++;
      if (task.dueDate >= today && task.dueDate <= soonLimit) dueSoon++;
    }
    const entry = perProject.get(task.projectId) ?? { counts: emptyCounts(), overdue: 0 };
    entry.counts[status]++;
    if (late) entry.overdue++;
    perProject.set(task.projectId, entry);
  }

  const projects: ProjectStat[] = [...perProject.entries()]
    .map(([projectId, e]) => {
      const total = e.counts.a_faire + e.counts.en_cours + e.counts.terminee;
      return {
        projectId,
        name: projectNames.get(projectId) ?? `Projet ${projectId}`,
        total,
        counts: e.counts,
        completion: percent(e.counts.terminee, total),
        overdue: e.overdue,
        health: healthOf(total, e.overdue),
      };
    })
    .sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || a.name.localeCompare(b.name));

  const upcoming = tasks
    .filter((t) => statusOf(t) !== 'terminee')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  return {
    total: tasks.length,
    counts,
    completion: percent(counts.terminee, tasks.length),
    overdue,
    dueSoon,
    urgentOpen,
    byPriority,
    health: healthOf(tasks.length, overdue),
    projects,
    upcoming,
  };
}

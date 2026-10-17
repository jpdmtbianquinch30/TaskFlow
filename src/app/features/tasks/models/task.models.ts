export type TaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente';
export type TaskStatus = 'a_faire' | 'en_cours' | 'terminee';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  priority: TaskPriority;
  /** Avancement de la tâche. Pas dans le formulaire de création (« à faire » par défaut) : le propriétaire le change ensuite. */
  status: TaskStatus;
  /** Emails des membres assignés (un ou plusieurs), stockés dans db.json avec la tâche. */
  assigneeEmails: string[];
  /** Format AAAA-MM-JJ. */
  dueDate: string;
  createdAt: string;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt'>;

export interface TaskComment {
  id: number;
  taskId: number;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'basse', label: 'Basse' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'haute', label: 'Haute' },
  { value: 'urgente', label: 'Urgente' },
];

export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
];

/** Statut d'une tâche, « à faire » si une ancienne tâche (créée avant l'ajout du statut) n'en a pas. */
export function statusOf(task: { status?: TaskStatus }): TaskStatus {
  return task.status ?? 'a_faire';
}

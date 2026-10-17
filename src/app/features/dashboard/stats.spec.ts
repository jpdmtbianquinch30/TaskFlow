import { Task } from '../tasks/models/task.models';
import { addDaysIso, computeStats, daysUntil, healthOf } from './stats';

const TODAY = '2026-10-17';

function task(id: number, over: Partial<Task> = {}): Task {
  return {
    id, projectId: 1, title: `t${id}`, description: 'd', priority: 'moyenne', status: 'a_faire',
    assigneeEmails: ['a@b.com'], dueDate: '2026-10-30', createdAt: '', ...over,
  };
}

describe('stats du tableau de bord', () => {
  it('addDaysIso et daysUntil calculent sans piège de fuseau', () => {
    expect(addDaysIso('2026-10-30', 3)).toBe('2026-11-02');
    expect(daysUntil(TODAY, '2026-10-20')).toBe(3);
    expect(daysUntil(TODAY, '2026-10-10')).toBe(-7);
  });

  it('healthOf : vide, saine, à surveiller, en danger', () => {
    expect(healthOf(0, 0)).toBe('vide');
    expect(healthOf(8, 0)).toBe('saine');
    expect(healthOf(8, 2)).toBe('surveiller'); // 25 %
    expect(healthOf(8, 3)).toBe('danger');
  });

  it('compte les statuts, le taux de réalisation et les retards', () => {
    const stats = computeStats(
      [
        task(1, { status: 'terminee', dueDate: '2026-10-01' }), // terminée : jamais en retard
        task(2, { status: 'en_cours', dueDate: '2026-10-10' }), // en retard
        task(3, { status: 'a_faire', dueDate: '2026-10-20', priority: 'urgente' }), // sous 7 jours
        task(4, { status: 'a_faire', dueDate: '2026-12-01' }),
      ],
      new Map([[1, 'Refonte']]),
      TODAY,
    );
    expect(stats.total).toBe(4);
    expect(stats.counts).toEqual({ a_faire: 2, en_cours: 1, terminee: 1 });
    expect(stats.completion).toBe(25);
    expect(stats.overdue).toBe(1);
    expect(stats.dueSoon).toBe(1);
    expect(stats.urgentOpen).toBe(1);
    expect(stats.byPriority.urgente).toBe(1);
    expect(stats.health).toBe('surveiller'); // 1 retard sur 4 tâches = 25 %
  });

  it('une ancienne tâche sans statut compte comme « à faire »', () => {
    const old = { ...task(1) } as Partial<Task>;
    delete old.status;
    expect(computeStats([old as Task], new Map(), TODAY).counts.a_faire).toBe(1);
  });

  it('classe les projets du plus en danger au plus sain et nomme chaque projet', () => {
    const stats = computeStats(
      [
        task(1, { projectId: 1 }),
        task(2, { projectId: 2, dueDate: '2026-10-01' }),
        task(3, { projectId: 2, dueDate: '2026-10-02' }),
      ],
      new Map([[1, 'Sain'], [2, 'Risqué']]),
      TODAY,
    );
    expect(stats.projects.map((p) => p.name)).toEqual(['Risqué', 'Sain']);
    expect(stats.projects[0].health).toBe('danger');
    expect(stats.projects[1].health).toBe('saine');
  });

  it('les prochaines échéances ignorent les tâches terminées et sont triées par date', () => {
    const stats = computeStats(
      [
        task(1, { dueDate: '2026-11-01' }),
        task(2, { status: 'terminee', dueDate: '2026-10-01' }),
        task(3, { dueDate: '2026-10-05' }),
      ],
      new Map(),
      TODAY,
    );
    expect(stats.upcoming.map((t) => t.id)).toEqual([3, 1]);
  });
});

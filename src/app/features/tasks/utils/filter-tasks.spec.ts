import { Task } from '../models/task.models';
import { NO_FILTERS, filterTasks, hasActiveFilters } from './filter-tasks';

function task(id: number, over: Partial<Task> = {}): Task {
  return {
    id, projectId: 1, title: `t${id}`, description: 'd', priority: 'moyenne', status: 'a_faire',
    assigneeEmails: ['a@b.com'], dueDate: '2026-10-20', createdAt: '', ...over,
  };
}

describe('filterTasks', () => {
  const tasks = [
    task(1, { status: 'a_faire', priority: 'haute', dueDate: '2026-10-10' }),
    task(2, { status: 'en_cours', priority: 'haute', dueDate: '2026-10-20' }),
    task(3, { status: 'terminee', priority: 'basse', dueDate: '2026-11-05' }),
  ];

  it('sans filtre, garde tout', () => {
    expect(filterTasks(tasks, NO_FILTERS)).toHaveLength(3);
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it('filtre par statut', () => {
    expect(filterTasks(tasks, { ...NO_FILTERS, status: 'en_cours' }).map((t) => t.id)).toEqual([2]);
  });

  it('filtre par priorité', () => {
    expect(filterTasks(tasks, { ...NO_FILTERS, priority: 'haute' }).map((t) => t.id)).toEqual([1, 2]);
  });

  it('filtre par période de date limite (bornes incluses)', () => {
    expect(filterTasks(tasks, { ...NO_FILTERS, from: '2026-10-10', to: '2026-10-20' }).map((t) => t.id)).toEqual([1, 2]);
    expect(filterTasks(tasks, { ...NO_FILTERS, from: '2026-11-01' }).map((t) => t.id)).toEqual([3]);
  });

  it('combine les filtres', () => {
    const f = { ...NO_FILTERS, priority: 'haute' as const, to: '2026-10-15' };
    expect(filterTasks(tasks, f).map((t) => t.id)).toEqual([1]);
    expect(hasActiveFilters(f)).toBe(true);
  });
});

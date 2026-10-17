import { isInDateRange } from '../../../core/utils/date';
import { Task, TaskPriority, TaskStatus, statusOf } from '../models/task.models';

/** Les filtres de la liste des tâches. `from` / `to` portent sur la DATE LIMITE (AAAA-MM-JJ, vide = pas de borne). */
export interface TaskFilterValue {
  status: TaskStatus | 'tous';
  priority: TaskPriority | 'toutes';
  from: string;
  to: string;
}

export const NO_FILTERS: TaskFilterValue = { status: 'tous', priority: 'toutes', from: '', to: '' };

export function hasActiveFilters(f: TaskFilterValue): boolean {
  return f.status !== 'tous' || f.priority !== 'toutes' || !!f.from || !!f.to;
}

/** Les filtres se combinent : une tâche doit satisfaire TOUS les filtres actifs. */
export function filterTasks(tasks: Task[], f: TaskFilterValue): Task[] {
  return tasks.filter(
    (t) =>
      (f.status === 'tous' || statusOf(t) === f.status) &&
      (f.priority === 'toutes' || t.priority === f.priority) &&
      isInDateRange(t.dueDate, f.from, f.to),
  );
}

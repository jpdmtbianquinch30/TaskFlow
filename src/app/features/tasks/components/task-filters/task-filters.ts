import { Component, computed, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PRIORITIES, STATUSES, TaskPriority, TaskStatus } from '../../models/task.models';
import { NO_FILTERS, TaskFilterValue, hasActiveFilters } from '../../utils/filter-tasks';

/**
 * Barre de filtres des tâches : statut, priorité et période de date limite.
 * S'utilise en liaison double sens : <app-task-filters [(filters)]="filters" />
 */
@Component({
  selector: 'app-task-filters',
  imports: [MatButtonModule, MatButtonToggleModule],
  styleUrl: './task-filters.scss',
  templateUrl: './task-filters.html',
})
export class TaskFilters {
  readonly filters = model.required<TaskFilterValue>();

  protected readonly statuses = STATUSES;
  protected readonly priorities = PRIORITIES;

  protected readonly active = computed(() => hasActiveFilters(this.filters()));
  /** Début après la fin : aucune tâche ne peut correspondre, on l'explique. */
  protected readonly rangeInvalid = computed(() => {
    const { from, to } = this.filters();
    return !!from && !!to && from > to;
  });

  protected setStatus(status: TaskStatus | 'tous'): void {
    this.filters.update((f) => ({ ...f, status }));
  }

  protected setPriority(priority: TaskPriority | 'toutes'): void {
    this.filters.update((f) => ({ ...f, priority }));
  }

  protected setFrom(from: string): void {
    this.filters.update((f) => ({ ...f, from }));
  }

  protected setTo(to: string): void {
    this.filters.update((f) => ({ ...f, to }));
  }

  protected reset(): void {
    this.filters.set(NO_FILTERS);
  }
}

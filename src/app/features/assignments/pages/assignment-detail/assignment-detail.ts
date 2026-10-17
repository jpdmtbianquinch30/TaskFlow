import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UsersService } from '../../../../core/users/users';
import { TaskItem } from '../../../tasks/components/task-item/task-item';
import { TaskFilters } from '../../../tasks/components/task-filters/task-filters';
import { NO_FILTERS, TaskFilterValue, filterTasks } from '../../../tasks/utils/filter-tasks';
import { AssignmentsService } from '../../services/assignments';

/**
 * Un projet qui m'a été assigné : je vois UNIQUEMENT mes tâches et leurs infos.
 * Lecture seule (ni ajout, ni modification, ni suppression), mais je peux commenter.
 */
@Component({
  selector: 'app-assignment-detail',
  imports: [RouterLink, TaskItem, TaskFilters],
  styleUrl: './assignment-detail.scss',
  templateUrl: './assignment-detail.html',
})
export class AssignmentDetail {
  private readonly assignments = inject(AssignmentsService);
  private readonly usersService = inject(UsersService);
  private readonly projectId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly loading = this.assignments.loading;
  protected readonly project = computed(() => this.assignments.projects().find((p) => p.id === this.projectId) ?? null);
  protected readonly myTasks = computed(() => this.assignments.tasks().filter((t) => t.projectId === this.projectId));

  // Mêmes filtres que chez le propriétaire : statut, priorité, date limite.
  protected readonly filters = signal<TaskFilterValue>(NO_FILTERS);
  protected readonly visibleTasks = computed(() => filterTasks(this.myTasks(), this.filters()));

  constructor() {
    this.usersService.load();
    this.assignments.load();
  }
}

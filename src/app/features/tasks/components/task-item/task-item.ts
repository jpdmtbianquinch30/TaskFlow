import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { UsersService } from '../../../../core/users/users';
import { PRIORITIES, STATUSES, Task, TaskStatus, statusOf } from '../../models/task.models';
import { TasksService } from '../../services/tasks';
import { TaskComments } from '../task-comments/task-comments';

/**
 * Affiche une tâche.
 * - `editable` = true  : propriétaire du projet → boutons Modifier / Supprimer.
 * - `editable` = false : membre assigné → lecture seule, il peut seulement commenter.
 */
@Component({
  selector: 'app-task-item',
  imports: [DatePipe, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, TaskComments],
  styleUrl: './task-item.scss',
  templateUrl: './task-item.html',
})
export class TaskItem {
  private readonly tasksService = inject(TasksService);
  private readonly usersService = inject(UsersService);

  readonly task = input.required<Task>();
  readonly editable = input(false);

  protected readonly showComments = signal(false);

  protected readonly statuses = STATUSES;
  protected readonly status = computed(() => statusOf(this.task()));
  protected readonly statusLabel = computed(() => STATUSES.find((s) => s.value === this.status())?.label ?? '');

  protected readonly priorityLabel = computed(() => PRIORITIES.find((p) => p.value === this.task().priority)?.label ?? '');

  protected readonly assigneeNames = computed(() => this.task().assigneeEmails.map((email) => this.usersService.labelOfEmail(email)));

  protected readonly overdue = computed(() => {
    const { dueDate } = this.task();
    return !!dueDate && this.status() !== 'terminee' && dueDate < new Date().toISOString().slice(0, 10);
  });

  /** Le propriétaire fait avancer la tâche (la liste se met à jour toute seule). */
  onStatusChange(status: TaskStatus): void {
    this.tasksService.update(this.task().id, { status }).subscribe();
  }

  onDelete(): void {
    if (confirm(`Supprimer la tâche « ${this.task().title} » et ses commentaires ?`)) {
      this.tasksService.remove(this.task()).subscribe();
    }
  }
}

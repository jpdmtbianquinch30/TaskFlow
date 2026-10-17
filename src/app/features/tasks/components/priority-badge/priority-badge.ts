import { Component, computed, input } from '@angular/core';
import { PRIORITIES, TaskPriority } from '../../models/task.models';

/** Pastille colorée de priorité (basse, moyenne, haute, urgente). */
@Component({
  selector: 'app-priority-badge',
  styleUrl: './priority-badge.scss',
  template: `<span [class]="'badge badge--' + priority()">{{ label() }}</span>`,
})
export class PriorityBadge {
  readonly priority = input.required<TaskPriority>();
  protected readonly label = computed(() => PRIORITIES.find((p) => p.value === this.priority())?.label ?? '');
}

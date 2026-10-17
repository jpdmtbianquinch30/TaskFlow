import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AuthService } from '../../core/auth/auth';
import { todayIso } from '../../core/utils/date';
import { PriorityBadge } from '../tasks/components/priority-badge/priority-badge';
import { PRIORITIES, STATUSES, Task } from '../tasks/models/task.models';
import { DonutChart, DonutSegment } from './components/donut-chart/donut-chart';
import { DashboardService } from './services/dashboard';
import { HEALTH_LABELS, PRIORITY_COLORS, STATUS_COLORS, computeStats, daysUntil } from './stats';

type Scope = 'projets' | 'assignations';

/** Tableau de bord : performances et avancement, soit de MES projets, soit de MES assignations. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatButtonModule, MatButtonToggleModule, DonutChart, PriorityBadge],
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly service = inject(DashboardService);
  private readonly auth = inject(AuthService);

  protected readonly name = computed(() => this.auth.currentUser()?.name ?? '');
  protected readonly loading = this.service.loading;
  protected readonly error = this.service.error;
  protected readonly scope = signal<Scope>('projets');

  private readonly today = todayIso();
  private readonly tasks = computed(() =>
    this.scope() === 'projets' ? this.service.mineTasks() : this.service.assignedTasks(),
  );

  protected readonly stats = computed(() => computeStats(this.tasks(), this.service.projectNames(), this.today));
  protected readonly healthLabel = computed(() => HEALTH_LABELS[this.stats().health]);
  protected readonly projectNames = this.service.projectNames;

  protected readonly statusSegments = computed<DonutSegment[]>(() =>
    STATUSES.map((s) => ({ label: s.label, value: this.stats().counts[s.value], color: STATUS_COLORS[s.value] })),
  );

  protected readonly priorityBars = computed(() => {
    const byPriority = this.stats().byPriority;
    const max = Math.max(1, ...PRIORITIES.map((p) => byPriority[p.value]));
    return PRIORITIES.map((p) => ({
      label: p.label,
      value: byPriority[p.value],
      width: (byPriority[p.value] / max) * 100,
      color: PRIORITY_COLORS[p.value],
    }));
  });

  protected readonly healthLabels = HEALTH_LABELS;

  constructor() {
    this.service.load();
  }

  protected reload(): void {
    this.service.load();
  }

  protected projectLink(projectId: number): (string | number)[] {
    return [this.scope() === 'projets' ? '/projects' : '/assignments', projectId];
  }

  protected barWidth(count: number, total: number): number {
    return total === 0 ? 0 : (count / total) * 100;
  }

  /** « en retard de 3 j », « aujourd'hui », « demain », « dans 5 j ». */
  protected dueLabel(task: Task): string {
    const days = daysUntil(this.today, task.dueDate);
    if (days < 0) return `en retard de ${-days} j`;
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'demain';
    return `dans ${days} j`;
  }

  protected isLate(task: Task): boolean {
    return daysUntil(this.today, task.dueDate) < 0;
  }
}

import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';
import { Project } from '../../projects/models/project.models';
import { Task } from '../../tasks/models/task.models';

/** Les données du tableau de bord : mes projets, mes tâches et celles qui me sont assignées. LECTURE SEULE. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _projects = signal<Project[]>([]);
  private readonly _tasks = signal<Task[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly myEmail = computed(() => (this.auth.currentUser()?.email ?? '').toLowerCase());

  /** Nom de chaque projet (mes projets ET ceux où l'on m'a assigné des tâches). */
  readonly projectNames = computed(() => new Map(this._projects().map((p) => [p.id, p.name])));

  /** Les tâches des projets que j'ai créés. */
  readonly mineTasks = computed(() => {
    const email = this.myEmail();
    const myIds = new Set(this._projects().filter((p) => p.ownerEmail?.toLowerCase() === email).map((p) => p.id));
    return this._tasks().filter((t) => myIds.has(t.projectId));
  });

  /** Les tâches qui me sont assignées par d'autres (ou par moi). */
  readonly assignedTasks = computed(() => {
    const email = this.myEmail();
    return this._tasks().filter((t) => t.assigneeEmails?.some((e) => e.toLowerCase() === email));
  });

  load(): void {
    this._loading.set(true);
    this._error.set(false);
    forkJoin({
      projects: this.http.get<Project[]>(`${environment.apiUrl}/projects`),
      tasks: this.http.get<Task[]>(`${environment.apiUrl}/tasks`),
    }).subscribe({
      next: ({ projects, tasks }) => {
        this._projects.set(projects);
        this._tasks.set(tasks);
        this._loading.set(false);
      },
      error: () => {
        this._error.set(true);
        this._loading.set(false);
      },
    });
  }
}

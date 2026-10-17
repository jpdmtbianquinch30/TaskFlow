import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';
import { enc, escapeRegex } from '../../../core/utils/query';
import { Project } from '../../projects/models/project.models';
import { Task } from '../../tasks/models/task.models';

/** Ce qui m'a été assigné par d'autres : mes tâches, et les projets qui les contiennent. LECTURE SEULE. */
@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _tasks = signal<Task[]>([]);
  private readonly _projects = signal<Project[]>([]);
  private readonly _loading = signal(false);

  /** Les tâches qui me sont assignées (et seulement celles-là). */
  readonly tasks = this._tasks.asReadonly();
  /** Les projets contenant au moins une tâche qui m'est assignée. */
  readonly projects = this._projects.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly tasksCountByProject = computed(() => {
    const counts = new Map<number, number>();
    for (const t of this._tasks()) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
    return counts;
  });

  load(): void {
    const email = (this.auth.currentUser()?.email ?? '').toLowerCase();
    this._tasks.set([]);
    this._projects.set([]);
    if (!email) return;

    this._loading.set(true);
    // `assigneeEmails` est un tableau : json-server le compare en texte avec `_like` (expression régulière,
    // d'où l'échappement). Le filtre exact est refait ensuite ici, pour ne garder que de vrais assignés.
    this.http
      .get<Task[]>(`${environment.apiUrl}/tasks?assigneeEmails_like=${enc(escapeRegex(email))}&_sort=id&_order=asc`)
      .pipe(
        map((tasks) => tasks.filter((t) => t.assigneeEmails?.some((e) => e.toLowerCase() === email))),
        switchMap((tasks) => {
          const ids = [...new Set(tasks.map((t) => t.projectId))];
          if (ids.length === 0) return of({ tasks, projects: [] as Project[] });
          const query = ids.map((id) => `id=${id}`).join('&');
          return this.http
            .get<Project[]>(`${environment.apiUrl}/projects?${query}`)
            .pipe(map((projects) => ({ tasks, projects })));
        }),
      )
      .subscribe({
        next: ({ tasks, projects }) => {
          this._tasks.set(tasks);
          this._projects.set(projects);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      });
  }
}

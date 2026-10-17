import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjetsService } from '../../projects/services/projets';
import { Task, TaskInput } from '../models/task.models';

/** Gestion des tâches par le PROPRIÉTAIRE du projet (les assignés passent par AssignmentsService, en lecture seule). */
@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly projets = inject(ProjetsService);
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  private readonly _tasks = signal<Task[]>([]);
  private readonly _loading = signal(false);

  readonly tasks = this._tasks.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Charge les tâches d'UN projet (relation 1-N : /tasks?projectId=...). */
  loadForProject(projectId: number): void {
    this._tasks.set([]);
    this._loading.set(true);
    this.http.get<Task[]>(this.apiUrl, { params: { projectId, _sort: 'id', _order: 'asc' } }).subscribe({
      next: (tasks) => {
        this._tasks.set(tasks);
        this._loading.set(false);
        this.projets.syncTasksCount(projectId, tasks.length);
      },
      error: () => this._loading.set(false),
    });
  }

  /** Pour la page de modification (accès direct par l'URL, la liste n'est pas forcément chargée). */
  getById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`);
  }

  /**
   * Le compteur du projet n'est pas touché ici : la page de formulaire peut être ouverte
   * sans que la liste soit chargée. Il est resynchronisé au retour sur la page du projet (loadForProject).
   */
  add(input: TaskInput): Observable<Task> {
    const task = { ...input, createdAt: new Date().toISOString() };
    return this.http.post<Task>(this.apiUrl, task);
  }

  update(id: number, patch: Partial<TaskInput>): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/${id}`, patch).pipe(
      tap((updated) => this._tasks.update((list) => list.map((t) => (t.id === id ? updated : t)))),
    );
  }

  /** Supprime la tâche ET ses commentaires (json-server : _dependent=comments). */
  remove(task: Task): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${task.id}`, { params: { _dependent: 'comments' } }).pipe(
      tap(() => {
        this._tasks.update((list) => list.filter((t) => t.id !== task.id));
        this.projets.syncTasksCount(task.projectId, this._tasks().length);
      }),
    );
  }
}

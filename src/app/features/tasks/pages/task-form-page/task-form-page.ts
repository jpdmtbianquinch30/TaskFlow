import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, switchMap, throwError } from 'rxjs';
import { Panel } from '../../../../shared/components/panel/panel';
import { Project } from '../../../projects/models/project.models';
import { ProjetsService } from '../../../projects/services/projets';
import { TaskForm } from '../../components/task-form/task-form';
import { Task } from '../../models/task.models';
import { TasksService } from '../../services/tasks';

/**
 * Page dédiée au formulaire de tâche (le CRUD n'est plus sur la page de la liste) :
 * /projects/:id/tasks/new → création · /projects/:id/tasks/:taskId/edit → modification.
 * Réservée au propriétaire du projet.
 */
@Component({
  selector: 'app-task-form-page',
  imports: [RouterLink, Panel, TaskForm],
  styleUrl: './task-form-page.scss',
  templateUrl: './task-form-page.html',
})
export class TaskFormPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projets = inject(ProjetsService);
  private readonly tasksService = inject(TasksService);

  protected readonly projectId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly taskId = this.route.snapshot.paramMap.get('taskId');

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly project = signal<Project | null>(null);
  protected readonly task = signal<Task | null>(null);
  protected readonly isEdit = this.taskId !== null;

  constructor() {
    this.projets
      .getById(this.projectId)
      .pipe(
        switchMap((project) => {
          // Un projet qui n'est pas à moi n'existe pas pour moi.
          if (!this.projets.isOwner(project)) return throwError(() => new Error('forbidden'));
          this.project.set(project);
          if (this.taskId === null) return of(null);
          return this.tasksService.getById(Number(this.taskId)).pipe(
            map((task) => {
              if (task.projectId !== project.id) throw new Error('mismatch');
              return task;
            }),
          );
        }),
      )
      .subscribe({
        next: (task) => {
          this.task.set(task);
          this.loading.set(false);
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
  }

  protected backToProject(): void {
    this.router.navigate(['/projects', this.projectId]);
  }
}

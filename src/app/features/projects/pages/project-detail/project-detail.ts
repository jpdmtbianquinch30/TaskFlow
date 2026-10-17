import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Project } from '../../models/project.models';
import { ProjetsService } from '../../services/projets';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { UsersService } from '../../../../core/users/users';
import { TaskItem } from '../../../tasks/components/task-item/task-item';
import { TaskFilters } from '../../../tasks/components/task-filters/task-filters';
import { NO_FILTERS, TaskFilterValue, filterTasks, hasActiveFilters } from '../../../tasks/utils/filter-tasks';
import { TasksService } from '../../../tasks/services/tasks';

interface DetailState {
  loading: boolean;
  notFound: boolean;
  project: Project | null;
}

const INITIAL_STATE: DetailState = {
  loading: true,
  notFound: false,
  project: null
};

/** Page d'un de MES projets : liste des tâches (filtrable par priorité) + bouton pour en ajouter. */
@Component({
  imports: [
    RouterLink,
    MatButtonModule,
    TaskItem,
    TaskFilters,
  ],
  selector: 'app-project-detail',
  styleUrl: './project-detail.scss',
  templateUrl: './project-detail.html',
})
export class ProjectDetail {
  private projectService = inject(ProjetsService);
  private route = inject(ActivatedRoute);
  private tasksService = inject(TasksService);
  private usersService = inject(UsersService);

  // paramMap est un Observable qui réémet à chaque changement de paramètre dans l'URL. Ici, on transforme cet Observable en signal pour pouvoir l'utiliser facilement dans le template.
  private readonly id = toSignal(this.route.paramMap.pipe(
    map(p => Number(p.get('id')!))), { requireSync: true});


  // switchMap annule automatiquement la requête précédente si l'id change, ce qui est utile si l'utilisateur navigue rapidement entre plusieurs projets.
  private readonly state = toSignal(
    toObservable(this.id).pipe(
      switchMap(id => {
        return this.projectService.getById(id).pipe(
          // Un projet créé par quelqu'un d'autre n'existe pas pour moi (il passe par « Mes assignations »).
          map((project): DetailState => this.projectService.isOwner(project)
            ? { loading: false, notFound: false, project }
            : { loading: false, notFound: true, project: null }),
          catchError(() => of<DetailState>({ loading: false, notFound: true, project: null })),
          startWith({ loading: true, notFound: false, project: null })
        );
      })
    ),
    { initialValue: INITIAL_STATE }
  );

  protected readonly project = computed(() => this.state().project);

  // --- Tâches du projet
  protected readonly tasks = this.tasksService.tasks;
  protected readonly tasksLoading = this.tasksService.loading;

  // --- Filtres : statut, priorité et date limite (ils se combinent)
  protected readonly filters = signal<TaskFilterValue>(NO_FILTERS);
  protected readonly filtersActive = computed(() => hasActiveFilters(this.filters()));
  protected readonly visibleTasks = computed(() => filterTasks(this.tasks(), this.filters()));

  protected readonly loading = computed(() => this.state().loading);
  protected readonly notFound = computed(() => this.state().notFound);

  protected readonly currentIndex = computed(() =>  {
    const current = this.project();
    if(!current) return -1;
    return this.projectService.projects().findIndex(p => p.id === current.id)
  }
  );

  protected readonly previousProject = computed(() =>  {
    const index = this.currentIndex();
    if(index<= 0) return null;
    return this.projectService.projects()[index - 1];
  }
  );

  protected readonly nextProject = computed(() =>  {
    const index = this.currentIndex();
    if(index< 0 || index >= this.projectService.projects().length - 1) return null;
    return this.projectService.projects()[index + 1];
  }
  );

  constructor() {
    this.usersService.load();
    this.projectService.loadMine(); // pour la navigation précédent / suivant (mes projets uniquement)
    // À chaque changement de projet dans l'URL, on recharge ses tâches et on remet les filtres à zéro.
    effect(() => {
      this.filters.set(NO_FILTERS);
      this.tasksService.loadForProject(this.id());
    });

    effect(() => {
      const project = this.project();
      document.title = project ? `TaskFlow - ${project.name}` : 'TaskFlow';
    });
  }

}

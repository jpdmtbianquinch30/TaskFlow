import { Component, computed, inject, signal } from '@angular/core';
import { ProjectCard } from '../../components/project-card/project-card';
import { Router, RouterLink } from "@angular/router";
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Project, PROJECT_STATUSES, ProjectStatus } from '../../models/project.models';
import { ProjetsService } from '../../services/projets';
import { APP_CONFIG, defaultAppConfig } from '../../../../core/config/app-config.token';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { isInDateRange } from '../../../../core/utils/date';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  imports: [ProjectCard, RouterLink, MatButtonModule, MatButtonToggleModule, DragDropModule, ReactiveFormsModule],
  selector: 'app-project-list',
  styleUrl: './project-list.scss',
  templateUrl: './project-list.html',
  // Scoping : Cette page recoit sa PROPRE instance de APP_CONFIG,
  // avec une pagination plus large que la config globale sans toucher
  // à ce que voient les autres composants (ex: Header)
  providers: [
    { provide: APP_CONFIG, useValue: { ...defaultAppConfig, defaultPageSize: 25} }
  ]
})
export class ProjectList {
  private projectService = inject(ProjetsService);
  private config = inject(APP_CONFIG);
  private router = inject(Router);
  /** Mes projets uniquement (ceux que j'ai créés). */
  protected readonly projects = this.projectService.projects;
  protected readonly loading = this.projectService.loading;
  protected readonly activeProjectsCount = this.projectService.activeProjectsCount;
  protected readonly pageSize = this.config.defaultPageSize;

  protected readonly statuses = PROJECT_STATUSES;
  protected readonly statusFilter = signal<ProjectStatus | 'tous'>('tous');

  // ---- Filtre par date de création -------------------------------------------------------------
  // Deux champs <input type="date"> pilotés par des FormControl. toSignal les convertit en signals :
  // les computed ci-dessous se recalculent donc tout seuls dès qu'une date change.
  // (Un FormControl évite un piège : réécrire la valeur dans un champ date pendant la saisie l'effacerait.)
  protected readonly dateFromCtrl = new FormControl('', { nonNullable: true });
  protected readonly dateToCtrl = new FormControl('', { nonNullable: true });
  protected readonly dateFrom = toSignal(this.dateFromCtrl.valueChanges, { initialValue: '' });
  protected readonly dateTo = toSignal(this.dateToCtrl.valueChanges, { initialValue: '' });

  protected readonly dateFilterActive = computed(() => !!this.dateFrom() || !!this.dateTo());
  /** Début après la fin : aucun projet ne peut correspondre, on l'explique à l'utilisateur. */
  protected readonly dateRangeInvalid = computed(() => !!this.dateFrom() && !!this.dateTo() && this.dateFrom() > this.dateTo());

  /** Mes projets dont la date de création est dans l'intervalle choisi (tous si aucune date n'est saisie). */
  private readonly projectsInDateRange = computed(() =>
    this.projects().filter(p => isInDateRange(p.createdAt, this.dateFrom(), this.dateTo()))
  );

  /**
   * Colonnes du tableau (une par statut). Les deux filtres se combinent :
   *  1. le filtre de DATE réduit la liste des projets ;
   *  2. le filtre de STATUT masque les colonnes des autres statuts.
   */
  protected readonly columns = computed(() => {
    const filter = this.statusFilter();
    const inRange = this.projectsInDateRange();
    return this.statuses
      .filter(s => filter === 'tous' || s.value === filter)
      .map(s => ({ ...s, projects: inRange.filter(p => p.status === s.value) }));
  });

  protected readonly statusError = signal(false);
  private justDragged = false;

  constructor() {
    this.projectService.loadMine(true);
  }

  /** Dépôt d'un projet dans la colonne d'un statut : on change son statut pour tout le monde. */
  onDrop(event: CdkDragDrop<Project[]>, status: ProjectStatus) {
    if (event.previousContainer === event.container) return;
    const project: Project = event.item.data;
    this.statusError.set(false);
    this.projectService.updateStatus(project.id, status).subscribe({
      error: () => this.statusError.set(true)
    });
  }

  onDragEnded() {
    // Un glisser ne doit pas ouvrir le projet (le clic suit le relâchement du bouton).
    this.justDragged = true;
    setTimeout(() => (this.justDragged = false), 150);
  }

  /**
   * Methode pour récuper l'evenement exposer par le dumb component enfant ProjectCard
   * @param project
   */
  onProjectSelected(project: Project) {
    if (this.justDragged) return;
    this.router.navigate(['/projects', project.id]);
  }

  

  /** Nombre de projets réellement affichés, et indicateur « au moins un filtre est actif ». */
  protected readonly filteredCount = computed(() => this.columns().reduce((sum, col) => sum + col.projects.length, 0));
  protected readonly filtersActive = computed(() => this.statusFilter() !== 'tous' || this.dateFilterActive());

  protected resetDateFilter(): void {
    this.dateFromCtrl.reset();
    this.dateToCtrl.reset();
  }

}

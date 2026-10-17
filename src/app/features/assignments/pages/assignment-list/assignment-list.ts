import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectCard } from '../../../projects/components/project-card/project-card';
import { Project } from '../../../projects/models/project.models';
import { AssignmentsService } from '../../services/assignments';

/** « Mes assignations » : les projets (créés par d'autres) dans lesquels une tâche m'a été assignée. */
@Component({
  selector: 'app-assignment-list',
  imports: [RouterLink, ProjectCard],
  styleUrl: './assignment-list.scss',
  templateUrl: './assignment-list.html',
})
export class AssignmentList {
  private readonly assignments = inject(AssignmentsService);

  protected readonly projects = this.assignments.projects;
  protected readonly loading = this.assignments.loading;
  private readonly counts = this.assignments.tasksCountByProject;

  constructor() {
    this.assignments.load();
  }

  protected subtitleOf(project: Project): string {
    const count = this.counts().get(project.id) ?? 0;
    return `Par ${project.ownerName || project.ownerEmail} · ${count} tâche(s) pour vous`;
  }
}

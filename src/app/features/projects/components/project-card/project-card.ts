import { Component, input, output } from '@angular/core';
import { Project } from '../../models/project.models';
import { DatePipe } from '@angular/common';

@Component({
  imports: [
    DatePipe
  ],
  selector: 'app-project-card',
  styleUrl: './project-card.scss',
  templateUrl: './project-card.html',
})
export class ProjectCard {
  /**
   * Un dumb component recoit des données via input()
   * et signale des événements vers l'extérieur via output()
   */
  project = input.required<Project>();
  /** Ligne d'information facultative sous la description (ex: « Par Moustapha · 2 tâche(s) pour vous »). */
  subtitle = input<string>('');
  selected = output<Project>();

  onSelect(){
    this.selected.emit(this.project());
  }
}

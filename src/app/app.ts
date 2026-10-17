import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './core/layout/header/header';
import { ProjetsService } from './features/projects/services/projets';

@Component({
  imports: [RouterOutlet, Header],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private projectService = inject(ProjetsService);
  protected readonly totalTasksCount = this.projectService.totalTasksCount;
}

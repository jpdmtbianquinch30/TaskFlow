import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

export interface ProjectDraft {
  name: string;
  description: string;
  status: string;
}

@Component({
  imports: [MatCardModule],
  selector: 'app-project-preview',
  styleUrl: './project-preview.scss',
  templateUrl: './project-preview.html',
})
export class ProjectPreview implements OnChanges {

  @Input() draft: ProjectDraft | null = null;
  protected updateCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['draft'] && !changes['draft'].firstChange){
      this.updateCount++;
    }
  }
}

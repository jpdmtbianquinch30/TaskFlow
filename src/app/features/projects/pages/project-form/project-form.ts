import { ProjectDraft } from './../../components/project-preview/project-preview';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjetsService } from '../../services/projets';
import { Router } from '@angular/router';
import { Project } from '../../models/project.models';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProjectPreview } from '../../components/project-preview/project-preview';
import { uniqueProjectNameValidator } from '../../validators/unique-project-name.validators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';



@Component({
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatFormFieldModule,
    ProjectPreview
  ],
  selector: 'app-project-form',
  styleUrl: './project-form.scss',
  templateUrl: './project-form.html',
})
export class ProjectForm {
  private fb = inject(FormBuilder);
  private projetsService = inject(ProjetsService);
  private router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', {
      validators: [Validators.required, Validators.minLength(3)],
      asyncValidators: [uniqueProjectNameValidator(this.projetsService)],
      updateOn: 'blur' as const
    }],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    status: ['actif' as Project['status'], [Validators.required]]

  });

  protected readonly draft = signal<ProjectDraft>(this.form.getRawValue());

  constructor() {
    this.form.valueChanges
    .pipe(takeUntilDestroyed())
    .subscribe(value => this.draft.set(value as ProjectDraft))
  }

  onSubmit() {
    //console.log("form:", this.form);
    if(this.form.invalid || this.form.pending){
      this.form.markAllAsTouched();
      return;
    }

    const {name, description , status } = this.form.getRawValue();
    this.projetsService.addProject({name, description , status }).subscribe({
      next: () => this.router.navigate(['/projects']),
      error:() => {}
    }
    );

  }
}

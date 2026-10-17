import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../../core/auth/auth';
import { PRIORITIES, STATUSES, Task, TaskPriority, TaskStatus } from '../../models/task.models';
import { TasksService } from '../../services/tasks';
import { atLeastOneAssignee } from '../../validators/assignees.validator';

/**
 * Formulaire unique pour CRÉER une tâche (sans `task`) ou la MODIFIER (avec `task`).
 * Il est affiché par la page TaskFormPage, pas dans la liste des tâches.
 * Champs : titre, description, priorité, assigné(s) par email, date limite.
 * Le statut n'apparaît qu'en MODIFICATION : une nouvelle tâche démarre toujours « à faire ».
 */
@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  styleUrl: './task-form.scss',
  templateUrl: './task-form.html',
})
export class TaskForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly auth = inject(AuthService);

  readonly projectId = input.required<number>();
  readonly task = input<Task | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly priorities = PRIORITIES;
  protected readonly statuses = STATUSES;
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly submitted = signal(false);

  // Assignation par email : l'email saisi est vérifié (compte existant) puis ajouté à la liste.
  protected readonly newEmail = new FormControl('', { nonNullable: true, validators: [Validators.email] });
  protected readonly assignees = signal<string[]>([]);
  protected readonly emailError = signal('');
  protected readonly checking = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    priority: ['moyenne' as TaskPriority, [Validators.required]],
    status: ['a_faire' as TaskStatus, [Validators.required]],
    assigneeEmails: [[] as string[], [atLeastOneAssignee]],
    dueDate: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const t = this.task();
    if (t) {
      this.form.patchValue({
        title: t.title,
        description: t.description ?? '',
        priority: t.priority,
        status: t.status ?? 'a_faire',
        dueDate: t.dueDate ?? '',
      });
      this.setAssignees(t.assigneeEmails ?? []);
    }
  }

  private setAssignees(emails: string[]): void {
    this.assignees.set(emails);
    this.form.controls.assigneeEmails.setValue(emails);
  }

  addAssignee(): void {
    const email = this.newEmail.value.trim().toLowerCase();
    this.emailError.set('');
    if (!email) return;
    if (this.newEmail.invalid) {
      this.emailError.set('Email invalide.');
      return;
    }
    if (this.assignees().includes(email)) {
      this.emailError.set('Cette personne est déjà assignée.');
      return;
    }
    this.checking.set(true);
    this.auth.emailExists(email).subscribe({
      next: (exists) => {
        this.checking.set(false);
        if (!exists) {
          this.emailError.set('Aucun compte TaskFlow avec cet email.');
          return;
        }
        this.setAssignees([...this.assignees(), email]);
        this.newEmail.reset('');
      },
      error: () => {
        this.checking.set(false);
        this.emailError.set("Impossible de vérifier l'email. Réessayez.");
      },
    });
  }

  removeAssignee(email: string): void {
    this.setAssignees(this.assignees().filter((e) => e !== email));
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, description, priority, status, assigneeEmails, dueDate } = this.form.getRawValue();
    const data = { title: title.trim(), description: description.trim(), priority, status, assigneeEmails, dueDate };

    this.saving.set(true);
    this.failed.set(false);
    const existing = this.task();
    const request$ = existing
      ? this.tasksService.update(existing.id, data)
      : this.tasksService.add({ ...data, projectId: this.projectId() });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.failed.set(true);
      },
    });
  }
}

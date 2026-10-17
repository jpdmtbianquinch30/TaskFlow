import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../../core/auth/auth';
import { TaskComment } from '../../models/task.models';
import { CommentsService } from '../../services/comments';

@Component({
  selector: 'app-task-comments',
  imports: [ReactiveFormsModule, DatePipe, MatFormFieldModule, MatInputModule, MatButtonModule],
  styleUrl: './task-comments.scss',
  templateUrl: './task-comments.html',
})
export class TaskComments implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly commentsService = inject(CommentsService);
  private readonly auth = inject(AuthService);

  readonly taskId = input.required<number>();

  protected readonly comments = signal<TaskComment[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.maxLength(300)]],
  });

  ngOnInit(): void {
    this.commentsService.forTask(this.taskId()).subscribe({
      next: (list) => {
        this.comments.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    const user = this.auth.currentUser();
    const text = this.form.controls.text.value.trim();
    if (!user || !text) {
      this.form.markAllAsTouched();
      return;
    }
    this.failed.set(false);
    this.commentsService.add({ taskId: this.taskId(), authorId: user.id, authorName: user.name, text }).subscribe({
      next: (created) => {
        this.comments.update((list) => [...list, created]);
        this.form.reset();
      },
      error: () => this.failed.set(true),
    });
  }
}

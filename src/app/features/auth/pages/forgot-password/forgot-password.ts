import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { errorCode } from '../../../../core/auth/auth-error';

@Component({
  imports: [ReactiveFormsModule, MatInputModule, MatButtonModule, MatFormFieldModule, RouterLink],
  selector: 'app-forgot-password',
  styleUrl: '../auth-pages.scss',
  templateUrl: 'forgot-password.html',
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.requestPasswordReset(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          errorCode(err) === 'TOO_MANY_REQUESTS'
            ? 'Trop de demandes. Réessayez dans quelques minutes.'
            : 'Une erreur est survenue. Réessayez.',
        );
      },
    });
  }
}
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { errorCode } from '../../../../core/auth/auth-error';

// Un message par code d'erreur renvoyé par le serveur.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  EMAIL_NOT_VERIFIED: "Votre email n'est pas encore confirmé. Cliquez sur le lien reçu par mail.",
  TOO_MANY_REQUESTS: 'Trop de tentatives. Réessayez dans quelques minutes.',
  UNKNOWN: "Impossible de joindre le serveur d'authentification. Le backend est-il lancé ?",
};

@Component({
  imports: [ReactiveFormsModule, MatInputModule, MatButtonModule, MatFormFieldModule, RouterLink],
  selector: 'app-login',
  styleUrl: '../auth-pages.scss',
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly submitting = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly needsVerification = signal(false); // affiche le bouton "Renvoyer l'email"
  protected readonly resendDone = signal(false);

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.loginError.set(null);
    this.needsVerification.set(false);
    this.resendDone.set(false);

    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: (err) => {
        const code = errorCode(err);
        this.submitting.set(false);
        this.needsVerification.set(code === 'EMAIL_NOT_VERIFIED');
        this.loginError.set(MESSAGES[code] ?? MESSAGES['UNKNOWN']);
      },
    });
  }

  /** Mail perdu ou lien expiré : on demande au serveur de renvoyer un email de confirmation. */
  resendVerification() {
    this.authService
      .resendVerification(this.form.controls.email.value)
      .subscribe({ next: () => this.resendDone.set(true), error: () => this.resendDone.set(false) });
  }
}
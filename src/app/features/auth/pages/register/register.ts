import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { errorCode } from '../../../../core/auth/auth-error';
import { uniqueEmailValidator } from '../validators/unique-email.validator';
import { PASSWORD_PATTERN, passwordsMatch } from '../validators/password.validators';


const MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: 'Un compte existe déjà avec cet email.',
  MAIL_FAILED: "L'email de confirmation n'a pas pu être envoyé. Réessayez.",
  TOO_MANY_REQUESTS: 'Trop de demandes. Réessayez dans quelques minutes.',
  UNKNOWN: 'Impossible de créer le compte pour le moment. Le backend est-il lancé ?',
};

@Component({
  imports: [ReactiveFormsModule, MatInputModule, MatButtonModule, MatFormFieldModule, RouterLink],
  selector: 'app-register',
  styleUrl: '../auth-pages.scss',
  templateUrl: './register.html',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      // Format (synchrone) + unicité côté serveur (asynchrone).
      // updateOn:'blur' : on interroge le serveur quand on QUITTE le champ, pas à chaque frappe.
      email: [
        '',
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [uniqueEmailValidator(this.authService)],
          updateOn: 'blur' as const,
        },
      ],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch }, // validateur de GROUPE : compare deux champs entre eux
  );

  protected readonly submitting = signal(false);
  protected readonly registeredEmail = signal<string | null>(null); // non null = écran "vérifiez votre boîte mail"
  protected readonly errorMessage = signal<string | null>(null);

  onSubmit() {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.register(name, email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registeredEmail.set(email);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(MESSAGES[errorCode(err)] ?? MESSAGES['UNKNOWN']);
      },
    });
  }
}
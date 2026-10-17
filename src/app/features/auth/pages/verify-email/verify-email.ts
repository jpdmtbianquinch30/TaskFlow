import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { errorCode } from '../../../../core/auth/auth-error';

type VerifyState = 'loading' | 'success' | 'invalid' | 'expired';

@Component({
  imports: [RouterLink, MatButtonModule],
  selector: 'app-verify-email',
  styleUrl: '../auth-pages.scss',
  templateUrl: 'verify-email.html',
})
export class VerifyEmail {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  protected readonly state = signal<VerifyState>('loading');

  constructor() {
    // Le jeton vient du lien du mail : /verify-email?token=xxxx
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    this.authService.verifyEmail(token).subscribe({
      next: () => this.state.set('success'),
      error: (err) => this.state.set(errorCode(err) === 'EXPIRED_TOKEN' ? 'expired' : 'invalid'),
    });
  }
}
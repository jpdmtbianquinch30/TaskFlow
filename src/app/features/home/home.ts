import { Component, inject } from '@angular/core';
import { RouterLink } from "@angular/router";
import { AuthService } from '../../core/auth/auth';
import { Dashboard } from '../dashboard/dashboard';

/** Accueil : le tableau de bord pour un utilisateur connecté, une page de bienvenue sinon. */
@Component({
  imports: [RouterLink, Dashboard],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  protected readonly authService = inject(AuthService);
}

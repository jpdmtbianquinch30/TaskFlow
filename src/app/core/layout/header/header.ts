import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { APP_CONFIG } from '../../config/app-config.token';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { AuthService } from '../../auth/auth';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  private config = inject(APP_CONFIG);
  protected readonly authService = inject(AuthService);
  private router = inject(Router);
  protected readonly appName = this.config.appName;
  totalTasksCount = input(0);

  protected onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/user.model';

/** Liste des membres (utilisateurs inscrits), utilisée pour assigner les tâches. */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly _users = signal<User[]>([]);
  private loaded = false;

  readonly users = this._users.asReadonly();
  readonly byId = computed(() => new Map(this._users().map((u) => [u.id, u])));
  readonly byEmail = computed(() => new Map(this._users().map((u) => [u.email.toLowerCase(), u])));

  /** À appeler depuis une page protégée (le jeton est requis). Ne charge qu'une seule fois. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<User[]>(`${environment.authUrl}/auth/users`).subscribe({
      next: (users) => this._users.set(users),
      error: () => (this.loaded = false), // on pourra réessayer au prochain affichage
    });
  }

  nameOf(id: string): string {
    return this.byId().get(id)?.name ?? 'Utilisateur inconnu';
  }

  /** "Nom (email)" si le compte est connu, sinon juste l'email. */
  labelOfEmail(email: string): string {
    const user = this.byEmail().get(email.toLowerCase());
    return user ? `${user.name} (${user.email})` : email;
  }
}

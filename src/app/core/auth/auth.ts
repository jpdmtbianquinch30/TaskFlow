import { computed, inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from './user.model';

interface StoredSession {
  token: string;
  user: User;
  expiresAt: number;
}

const STORAGE_KEY = 'taskflow.session';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.authUrl}/auth`;

  private readonly _currentUser = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private expiresAt: number | null = null;

  // Signaux exposés en lecture seule : seul ce service peut modifier la session.
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  constructor() {
    // Au rechargement de la page, on restaure la session si elle n'a pas expiré.
    const session = this.readStoredSession();
    if (!session) return;
    this._currentUser.set(session.user);
    this._token.set(session.token);
    this.expiresAt = session.expiresAt;
  }

  // ---------------------------------------------------------------- CONNEXION

  /** Le serveur vérifie email + mot de passe et répond avec un JWT. Erreurs possibles : INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED. */
  login(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(
        tap((res) => this.startSession(res)),
        map((res) => res.user),
      );
  }

  logout(): void {
    this._currentUser.set(null);
    this._token.set(null);
    this.expiresAt = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Utilisé par le guard et par authInterceptor : renvoie le jeton, ou null s'il a expiré. */
  getValidToken(): string | null {
    const token = this._token();
    if (!token || !this.expiresAt) return null;
    if (Date.now() > this.expiresAt) {
      this.logout();
      return null;
    }
    return token;
  }

  // -------------------------------------------------------------- INSCRIPTION

  /** Pour le validateur asynchrone du formulaire : un compte existe-t-il déjà avec cet email ? */
  emailExists(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.baseUrl}/email-exists`, { params: { email } })
      .pipe(map((res) => res.exists));
  }

  /** Crée le compte (inactif) et déclenche l'envoi du mail de confirmation par le serveur. */
  register(name: string, email: string, password: string): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/register`, { name, email, password })
      .pipe(map(() => void 0));
  }

  /** Appelée par la page /verify-email avec le jeton du lien reçu par mail. */
  verifyEmail(token: string): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/verify-email`, { token })
      .pipe(map(() => void 0));
  }

  resendVerification(email: string): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/resend-verification`, { email })
      .pipe(map(() => void 0));
  }

  // ------------------------------------------------------ MOT DE PASSE OUBLIÉ

  requestPasswordReset(email: string): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/forgot-password`, { email })
      .pipe(map(() => void 0));
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/reset-password`, { token, password })
      .pipe(map(() => void 0));
  }

  // ------------------------------------------------------------------ PRIVÉ

  private startSession(res: AuthResponse): void {
    this._currentUser.set(res.user);
    this._token.set(res.token);
    this.expiresAt = res.expiresAt;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: res.token, user: res.user, expiresAt: res.expiresAt } satisfies StoredSession),
    );
  }

  private readStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const session: StoredSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(STORAGE_KEY); // contenu illisible : on repart propre
      return null;
    }
  }
}
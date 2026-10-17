import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { AuthResponse, User } from './user.model';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'taskflow.session';
const BASE = `${environment.authUrl}/auth`;
const USER: User = { id: 'u1', name: 'Aby Diop', email: 'aby@taskflow.dev' };

const sessionResponse = (expiresInMs = 60_000): AuthResponse => ({
  token: 'jwt-123',
  expiresAt: Date.now() + expiresInMs,
  user: USER,
});

describe('AuthService', () => {
  let http: HttpTestingController;

  /** Crée le service APRÈS avoir préparé le localStorage (il lit la session dans son constructeur). */
  const createService = () => TestBed.inject(AuthService);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('connexion', () => {
    it('envoie email et mot de passe, puis ouvre la session', () => {
      const service = createService();
      let result: User | undefined;
      service.login('aby@taskflow.dev', 'secret123').subscribe((user) => (result = user));

      const req = http.expectOne(`${BASE}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'aby@taskflow.dev', password: 'secret123' });
      req.flush(sessionResponse());

      expect(result).toEqual(USER);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()).toEqual(USER);
      expect(service.getValidToken()).toBe('jwt-123');
    });

    it("sauvegarde la session dans le localStorage, sans aucun mot de passe", () => {
      const service = createService();
      service.login('aby@taskflow.dev', 'secret123').subscribe();
      http.expectOne(`${BASE}/login`).flush(sessionResponse());

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.token).toBe('jwt-123');
      expect(stored.user).toEqual(USER);
      expect(JSON.stringify(stored)).not.toContain('secret123');
    });

    it("n'ouvre pas de session quand le serveur refuse les identifiants", () => {
      const service = createService();
      let failed = false;
      service.login('aby@taskflow.dev', 'mauvais').subscribe({ error: () => (failed = true) });

      http
        .expectOne(`${BASE}/login`)
        .flush({ code: 'INVALID_CREDENTIALS', message: 'x' }, { status: 401, statusText: 'Unauthorized' });

      expect(failed).toBe(true);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('déconnexion et expiration', () => {
    it('logout vide les signaux et le localStorage', () => {
      const service = createService();
      service.login('aby@taskflow.dev', 'secret123').subscribe();
      http.expectOne(`${BASE}/login`).flush(sessionResponse());

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.getValidToken()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("getValidToken renvoie null et déconnecte quand la session a expiré", () => {
      const service = createService();
      service.login('aby@taskflow.dev', 'secret123').subscribe();
      http.expectOne(`${BASE}/login`).flush(sessionResponse(-1000)); // déjà expirée

      expect(service.getValidToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('restauration de la session au chargement', () => {
    it('restaure une session encore valide', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'old', user: USER, expiresAt: Date.now() + 60_000 }));
      const service = createService();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()).toEqual(USER);
      expect(service.getValidToken()).toBe('old');
    });

    it('ignore et supprime une session expirée', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'old', user: USER, expiresAt: Date.now() - 1 }));
      const service = createService();

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('repart proprement quand le contenu stocké est illisible', () => {
      localStorage.setItem(STORAGE_KEY, '{ceci n est pas du json');
      const service = createService();

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('inscription et confirmation', () => {
    it("emailExists interroge le serveur et renvoie un booléen", () => {
      const service = createService();
      const results: boolean[] = [];
      service.emailExists('aby@taskflow.dev').subscribe((v) => results.push(v));

      const req = http.expectOne((r) => r.url === `${BASE}/email-exists`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('email')).toBe('aby@taskflow.dev');
      req.flush({ exists: true });

      expect(results).toEqual([true]);
    });

    it('register envoie nom, email et mot de passe', () => {
      const service = createService();
      let done = false;
      service.register('Aby Diop', 'aby@taskflow.dev', 'abc12345').subscribe(() => (done = true));

      const req = http.expectOne(`${BASE}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Aby Diop', email: 'aby@taskflow.dev', password: 'abc12345' });
      req.flush({ message: 'ok' }, { status: 201, statusText: 'Created' });

      expect(done).toBe(true);
      expect(service.isAuthenticated()).toBe(false); // s'inscrire ne connecte pas : il faut confirmer l'email
    });

    it('verifyEmail envoie le jeton du lien', () => {
      const service = createService();
      service.verifyEmail('tok-1').subscribe();

      const req = http.expectOne(`${BASE}/verify-email`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'tok-1' });
      req.flush({ message: 'ok' });
    });

    it('resendVerification envoie l\'email', () => {
      const service = createService();
      service.resendVerification('aby@taskflow.dev').subscribe();

      const req = http.expectOne(`${BASE}/resend-verification`);
      expect(req.request.body).toEqual({ email: 'aby@taskflow.dev' });
      req.flush({ message: 'ok' });
    });
  });

  describe('mot de passe oublié', () => {
    it('requestPasswordReset envoie l\'email', () => {
      const service = createService();
      service.requestPasswordReset('aby@taskflow.dev').subscribe();

      const req = http.expectOne(`${BASE}/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'aby@taskflow.dev' });
      req.flush({ message: 'ok' });
    });

    it('resetPassword envoie le jeton et le nouveau mot de passe', () => {
      const service = createService();
      service.resetPassword('tok-2', 'nouveau123').subscribe();

      const req = http.expectOne(`${BASE}/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'tok-2', password: 'nouveau123' });
      req.flush({ message: 'ok' });
    });
  });
});

import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let token: string | null;

  const apiProjects = `${environment.apiUrl}/projects`;

  beforeEach(() => {
    token = null;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getValidToken: () => token } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('laisse passer une lecture (GET) des données sans jeton, sans en-tête ajouté', () => {
    http.get(apiProjects).subscribe();

    const req = backend.expectOne(apiProjects);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it("bloque une écriture sans jeton : erreur 401 et AUCUNE requête n'est envoyée", () => {
    let error: HttpErrorResponse | undefined;
    http.post(apiProjects, {}).subscribe({ error: (e) => (error = e) });

    expect(error?.status).toBe(401);
    backend.expectNone(apiProjects);
  });

  it.each(['post', 'put', 'patch', 'delete'] as const)('bloque aussi %s sans jeton', (method) => {
    let error: HttpErrorResponse | undefined;
    http.request(method, `${apiProjects}/1`, { body: {} }).subscribe({ error: (e) => (error = e) });

    expect(error?.status).toBe(401);
    backend.expectNone(`${apiProjects}/1`);
  });

  it('ajoute le jeton Bearer aux écritures quand l\'utilisateur est connecté', () => {
    token = 'jwt-123';
    http.post(apiProjects, { name: 'X' }).subscribe();

    const req = backend.expectOne(apiProjects);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush({});
  });

  it("n'exige pas de jeton pour les appels d'authentification (inscription, connexion...)", () => {
    const url = `${environment.authUrl}/auth/register`;
    http.post(url, {}).subscribe();

    const req = backend.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('protège la liste des membres : refusée sans jeton', () => {
    const url = `${environment.authUrl}/auth/users`;
    let error: HttpErrorResponse | undefined;
    http.get(url).subscribe({ error: (e) => (error = e) });

    expect(error?.status).toBe(401);
    backend.expectNone(url);
  });

  it('envoie le jeton pour lire la liste des membres', () => {
    token = 'jwt-123';
    const url = `${environment.authUrl}/auth/users`;
    http.get(url).subscribe();

    const req = backend.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush([]);
  });
});

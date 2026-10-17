import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logout = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {}); // l'intercepteur journalise : on garde la sortie des tests propre

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { logout } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  it('un 401 sur les données (session expirée) déconnecte et renvoie vers /login', () => {
    let error: HttpErrorResponse | undefined;
    http.get(`${environment.apiUrl}/projects`).subscribe({ error: (e) => (error = e) });

    backend.expectOne(`${environment.apiUrl}/projects`).flush('x', { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(error?.status).toBe(401); // l'erreur continue de remonter à l'appelant
  });

  it("un 401 sur /auth/login (mauvais mot de passe) ne déconnecte PAS et ne redirige pas : c'est au formulaire d'afficher l'erreur", () => {
    let error: HttpErrorResponse | undefined;
    http.post(`${environment.authUrl}/auth/login`, {}).subscribe({ error: (e) => (error = e) });

    backend
      .expectOne(`${environment.authUrl}/auth/login`)
      .flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(error?.error.code).toBe('INVALID_CREDENTIALS');
  });

  it("une autre erreur (500) ne déconnecte pas mais remonte à l'appelant", () => {
    let error: HttpErrorResponse | undefined;
    http.get(`${environment.apiUrl}/projects`).subscribe({ error: (e) => (error = e) });

    backend.expectOne(`${environment.apiUrl}/projects`).flush('x', { status: 500, statusText: 'Server Error' });

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(error?.status).toBe(500);
  });

  it('une réponse normale passe sans effet de bord', () => {
    let body: unknown;
    http.get(`${environment.apiUrl}/projects`).subscribe((b) => (body = b));

    backend.expectOne(`${environment.apiUrl}/projects`).flush([{ id: 1 }]);

    expect(body).toEqual([{ id: 1 }]);
    expect(logout).not.toHaveBeenCalled();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProjetsService } from './projets';
import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';

describe('ProjetsService', () => {
  let service: ProjetsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1', name: 'Aby Diop', email: 'Aby+test@TaskFlow.dev' }) } },
      ],
    });
    service = TestBed.inject(ProjetsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ne charge que les projets créés par moi (email encodé, en minuscules)', () => {
    service.loadMine(true);
    http.expectOne(`${environment.apiUrl}/projects?ownerEmail=aby%2Btest%40taskflow.dev&_sort=id&_order=asc`).flush([]);
    expect(service.loading()).toBe(false);
  });

  it("marque l'utilisateur connecté comme propriétaire du projet créé", () => {
    service.addProject({ name: 'N', description: 'D', status: 'actif' }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/projects`);
    expect(req.request.body.ownerEmail).toBe('aby+test@taskflow.dev');
    expect(req.request.body.ownerName).toBe('Aby Diop');
        expect(req.request.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    req.flush({ id: 1, ...req.request.body });
  });

  it('isOwner compare les emails sans tenir compte de la casse', () => {
    const p = { id: 1, name: '', description: '', status: 'actif' as const, tasksCount: 0, ownerName: '' };
    expect(service.isOwner({ ...p, ownerEmail: 'ABY+test@taskflow.dev' })).toBe(true);
    expect(service.isOwner({ ...p, ownerEmail: 'jean@taskflow.dev' })).toBe(false);
  });
});

describe('ProjetsService.updateStatus', () => {
  let service: ProjetsService;
  let http: HttpTestingController;
  const base = { name: 'N', description: 'D', tasksCount: 0, ownerEmail: 'a@b.c', ownerName: 'A' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1', name: 'A', email: 'a@b.c' }) } },
      ],
    });
    service = TestBed.inject(ProjetsService);
    http = TestBed.inject(HttpTestingController);
    service.loadMine(true);
    http.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/projects?ownerEmail=`)).flush([
      { id: 1, status: 'actif', ...base },
    ]);
  });

  afterEach(() => http.verify());

  it('change le statut tout de suite et le sauvegarde sur le projet (donc pour tous)', () => {
    service.updateStatus(1, 'termine').subscribe();
    expect(service.projects()[0].status).toBe('termine');
    const req = http.expectOne(`${environment.apiUrl}/projects/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'termine' });
    req.flush({ id: 1, status: 'termine', ...base });
  });

  it("remet l'ancien statut si la sauvegarde échoue", () => {
    service.updateStatus(1, 'en_pause').subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/projects/1`).flush({}, { status: 500, statusText: 'Error' });
    expect(service.projects()[0].status).toBe('actif');
  });
});

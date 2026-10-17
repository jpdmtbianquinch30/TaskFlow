import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDetail } from './project-detail';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/auth';

const project = {
  id: 1,
  name: 'Refonte Facturation',
  description: 'Migration vers la nouvelle API de paiement',
  status: 'actif',
  tasksCount: 13,
  ownerEmail: 'moustapha@taskflow.dev',
  ownerName: 'Moustapha Diouf',
};

describe('ProjectDetail', () => {
  let fixture: ComponentFixture<ProjectDetail>;
  let httpMock: HttpTestingController;

  function setup(userEmail: string) {
    TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1', name: 'Test', email: userEmail }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProjectDetail);
    fixture.detectChanges();
    // Requêtes lancées à la création : mes projets (navigation), liste des membres, tâches du projet
    httpMock.match((r) => r.url.startsWith(`${environment.apiUrl}/projects?ownerEmail=`)).forEach((r) => r.flush([]));
    httpMock.match(`${environment.authUrl}/auth/users`).forEach((r) => r.flush([]));
    httpMock.match((r) => r.url === `${environment.apiUrl}/tasks`).forEach((r) => r.flush([]));
  }

  afterEach(() => {
    // La liste de tâches vide resynchronise le compteur du projet (PATCH) : on l'absorbe.
    httpMock.match((r) => r.method === 'PATCH').forEach((r) => r.flush({}));
    httpMock.verify();
  });

  it('affiche le projet à son propriétaire', () => {
    setup('moustapha@taskflow.dev');
    httpMock.expectOne((r) => r.method === 'GET' && r.url === `${environment.apiUrl}/projects/1`).flush(project);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Refonte Facturation');
    expect(text).toContain('Ajouter une tâche');
  });

  it("affiche « n'existe pas » quand le projet est introuvable", () => {
    setup('moustapha@taskflow.dev');
    httpMock.expectOne((r) => r.method === 'GET' && r.url === `${environment.apiUrl}/projects/1`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Ce projet n'existe pas");
  });

  it("cache le projet d'un autre utilisateur (il passe par Mes assignations)", () => {
    setup('sokhna@taskflow.dev');
    httpMock.expectOne((r) => r.method === 'GET' && r.url === `${environment.apiUrl}/projects/1`).flush(project);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain("Ce projet n'existe pas");
    expect(text).not.toContain('Ajouter une tâche');
  });
});

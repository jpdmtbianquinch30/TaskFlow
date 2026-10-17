import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssignmentsService } from './assignments';
import { AuthService } from '../../../core/auth/auth';
import { environment } from '../../../../environments/environment';

const task = (id: number, projectId: number, emails: string[]) => ({
  id, projectId, title: `t${id}`, description: 'd', priority: 'haute', status: 'a_faire', assigneeEmails: emails, dueDate: '2026-10-20', createdAt: '',
});

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1', name: 'Jean', email: 'jean@taskflow.dev' }) } },
      ],
    });
    service = TestBed.inject(AssignmentsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("ne garde que les tâches réellement assignées à l'utilisateur, puis charge leurs projets", () => {
    service.load();
    http.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/tasks?assigneeEmails_like=`)).flush([
      task(1, 10, ['jean@taskflow.dev']),
      task(2, 11, ['autrejean@taskflow.dev']), // faux positif du filtre texte : doit disparaître
      task(3, 10, ['x@y.com', 'JEAN@taskflow.dev']),
    ]);
    http.expectOne(`${environment.apiUrl}/projects?id=10`).flush([{ id: 10, name: 'P' }]);

    expect(service.tasks().map((t) => t.id)).toEqual([1, 3]);
    expect(service.projects().length).toBe(1);
    expect(service.tasksCountByProject().get(10)).toBe(2);
    expect(service.loading()).toBe(false);
  });

  it("ne charge aucun projet s'il n'y a aucune assignation", () => {
    service.load();
    http.expectOne((r) => r.url.startsWith(`${environment.apiUrl}/tasks?`)).flush([]);
    expect(service.projects()).toEqual([]);
  });
});

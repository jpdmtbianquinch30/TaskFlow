import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth';
import { enc, escapeRegex } from '../../../core/utils/query';
import { Project, ProjectStatus } from '../models/project.models';
import { todayIso } from '../../../core/utils/date';

/** Ce que le formulaire fournit : le propriétaire et le compteur de tâches sont ajoutés par le service. */
//le type : la date est ajoutée par le service, pas par le formulaire
export type ProjectInput = Omit<Project, 'id' | 'tasksCount' | 'ownerEmail' | 'ownerName' | 'createdAt'>;


@Injectable({
  providedIn: 'root'
})
export class ProjetsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/projects`;
  private readonly _projects = signal<Project[]>([]);
  private _loading = signal(false);
  /** Email de l'utilisateur pour qui la liste a été chargée (évite de montrer les projets du compte précédent). */
  private loadedFor: string | null = null;
  
  

  //Exposition du signal en lecture seule pour
  /** Uniquement les projets de l'utilisateur connecté. */
  readonly projects = this._projects.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly activeProjectsCount = computed(
    () => this._projects().filter(p => p.status === 'actif').length
  );

  readonly totalTasksCount = computed(
    () => this._projects().reduce((sum, p) => sum + p.tasksCount, 0)
  );

  private get myEmail(): string {
    return (this.auth.currentUser()?.email ?? '').toLowerCase();
  }

  /**
   * Charge les projets CRÉÉS par l'utilisateur connecté (filtre ownerEmail).
   * `force` = recharger même si la liste est déjà chargée pour cet utilisateur.
   */
  loadMine(force = false): void {
    const email = this.myEmail;
    if (!email) {
      this._projects.set([]);
      this._loading.set(false);
      this.loadedFor = null;
      return;
    }
    if (!force && this.loadedFor === email) return;
    if (this.loadedFor !== email) this._projects.set([]); // autre compte : on repart de zéro

    this._loading.set(true);
    this.http.get<Project[]>(`${this.apiUrl}?ownerEmail=${enc(email)}&_sort=id&_order=asc`).subscribe({
      next: projects => {
        this._projects.set(projects);
        this.loadedFor = email;
        this._loading.set(false);
      },
      error: () => this._loading.set(false)
    });
  }

  /** Vrai si le projet a été créé par l'utilisateur connecté. */
  isOwner(project: Project): boolean {
    const email = this.myEmail;
    return !!email && project.ownerEmail?.toLowerCase() === email;
  }

  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  /** Cherche parmi MES projets (les noms ne sont uniques que par utilisateur). */
  searchByName(name: string): Observable<Project[]> {
    return this.http.get<Project[]>(
      `${this.apiUrl}?ownerEmail=${enc(this.myEmail)}&name_like=${enc(escapeRegex(name))}`
    );
  }

  addProject(input: ProjectInput): Observable<Project> {
    const user = this.auth.currentUser();
    if (!user) return throwError(() => new Error('Utilisateur non connecté'));

    const project = { ...input, tasksCount: 0, ownerEmail: user.email.toLowerCase(), ownerName: user.name, createdAt: todayIso() };
    return this.http.post<Project>(this.apiUrl, project).pipe(
      tap(created => this._projects.update(projects => [...projects, created]))
    );
  }

  /**
   * Change le statut d'un projet (glisser-déposer). Mise à jour immédiate à l'écran, puis PATCH :
   * le statut est stocké sur le projet lui-même, donc tous ceux qui voient ce projet
   * (créateur et assignés) le retrouvent à jour. En cas d'échec, on remet l'ancien statut.
   */
  updateStatus(id: number, status: ProjectStatus): Observable<Project> {
    const previous = this._projects().find(p => p.id === id)?.status;
    const apply = (value: ProjectStatus) =>
      this._projects.update(list => list.map(p => p.id === id ? { ...p, status: value } : p));

    apply(status);
    return this.http.patch<Project>(`${this.apiUrl}/${id}`, { status }).pipe(
      catchError(err => {
        if (previous) apply(previous);
        return throwError(() => err);
      })
    );
  }

  /** Garde tasksCount du projet égal au vrai nombre de tâches (le header et la liste l'affichent). */
  syncTasksCount(id: number, count: number): void {
    const known = this._projects().find(p => p.id === id);
    if (known && known.tasksCount === count) return;
    this.http.patch<Project>(`${this.apiUrl}/${id}`, { tasksCount: count }).subscribe({
      next: () => this._projects.update(list => list.map(p => p.id === id ? { ...p, tasksCount: count } : p)),
      error: () => {}
    });
  }
}

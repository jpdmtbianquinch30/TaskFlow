import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TaskComment } from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/comments`;

  forTask(taskId: number): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(this.apiUrl, { params: { taskId, _sort: 'id', _order: 'asc' } });
  }

  add(input: Omit<TaskComment, 'id' | 'createdAt'>): Observable<TaskComment> {
    return this.http.post<TaskComment>(this.apiUrl, { ...input, createdAt: new Date().toISOString() });
  }
}

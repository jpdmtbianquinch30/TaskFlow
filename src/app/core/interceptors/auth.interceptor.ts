import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth';

// Les requêtes qui MODIFIENT des données (POST, PUT, PATCH, DELETE) vers json-server exigent un jeton valide.
// Les appels d'authentification vont vers un autre serveur (authUrl) : ils ne sont pas concernés
// (un visiteur qui s'inscrit n'a évidemment pas de jeton).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isWriteApiCall = req.url.startsWith(environment.apiUrl) && req.method !== 'GET';
  // La liste des membres (backend d'auth) est aussi réservée aux utilisateurs connectés.
  const isUsersCall = req.url === `${environment.authUrl}/auth/users`;
  if (!isWriteApiCall && !isUsersCall) {
    return next(req);
  }

  const token = inject(AuthService).getValidToken();
  if (!token) {
    return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url: req.url }));
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
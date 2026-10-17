import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(`Erreur HTTP ${error.status} sur ${req.method} ${req.url}`, error);

      // Un 401 sur les données (json-server) = session expirée : on déconnecte.
      // Mais un 401 sur /auth/login = "mauvais mot de passe" : ce n'est PAS une session expirée,
      // c'est au formulaire d'afficher l'erreur, pas à l'intercepteur de rediriger.
      const isAuthCall = req.url.startsWith(environment.authUrl);
      if (error.status === 401 && !isAuthCall) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
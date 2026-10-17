import { HttpErrorResponse } from '@angular/common/http';

/**
 * Le serveur répond toujours { code, message } en cas d'erreur.
 * On lit le "code" (stable : INVALID_CREDENTIALS, EMAIL_TAKEN...) pour choisir le message affiché.
 * Si le serveur ne répond pas du tout (backend éteint), il n'y a pas de corps : on renvoie 'UNKNOWN'.
 */
export function errorCode(err: unknown): string {
  return (err as HttpErrorResponse)?.error?.code ?? 'UNKNOWN';
}
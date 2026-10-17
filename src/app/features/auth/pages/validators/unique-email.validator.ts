import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { catchError, map, Observable, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth';


/** Même principe que uniqueProjectNameValidator : interroge le serveur, renvoie { emailTaken: true } si l'email existe. */
export function uniqueEmailValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const email = (control.value ?? '').trim();
    if (!email) return of(null);

    return authService.emailExists(email).pipe(
      map((exists) => (exists ? { emailTaken: true } : null)),
      // Si le serveur est injoignable, on ne bloque pas le formulaire : le serveur revérifiera de toute façon.
      catchError(() => of(null)),
    );
  };
}
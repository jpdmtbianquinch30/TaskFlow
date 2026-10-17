import { AbstractControl, AsyncValidatorFn, ValidationErrors } from "@angular/forms";
import { ProjetsService } from "../services/projets";
import { catchError, delay, map, Observable, of } from "rxjs";

export function uniqueProjectNameValidator(projectService: ProjetsService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const name = (control.value ?? '').trim().toLowerCase();

    if(!name) return of(null);

    return projectService.searchByName(name).pipe(
      map(matches => {
        const exists = matches.some(p => p.name.trim().toLowerCase() === name.toLowerCase());
        return exists ? { nameTaken: true} : null;
      }),
      catchError(() =>of(null))
    );
  };

}

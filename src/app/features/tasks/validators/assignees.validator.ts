import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Une tâche doit être assignée à au moins une personne. Erreur posée sur le contrôle sous la clé "required". */
export const atLeastOneAssignee = (control: AbstractControl): ValidationErrors | null => {
  const emails = control.value as string[] | null;
  return Array.isArray(emails) && emails.length > 0 ? null : { required: true };
};

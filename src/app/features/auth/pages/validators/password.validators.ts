import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Validateur de GROUPE : le champ password et le champ confirmPassword doivent être identiques. */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
};

/** Au moins 8 caractères, avec au moins une lettre et un chiffre (même règle que le serveur). */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
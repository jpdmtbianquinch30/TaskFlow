import { HttpErrorResponse } from '@angular/common/http';
import { errorCode } from './auth-error';

describe('errorCode', () => {
  it('lit le code renvoyé par le serveur', () => {
    const err = new HttpErrorResponse({ status: 403, error: { code: 'EMAIL_NOT_VERIFIED', message: 'x' } });
    expect(errorCode(err)).toBe('EMAIL_NOT_VERIFIED');
  });

  it("renvoie UNKNOWN quand le serveur ne répond pas (pas de corps)", () => {
    expect(errorCode(new HttpErrorResponse({ status: 0 }))).toBe('UNKNOWN');
  });

  it('renvoie UNKNOWN quand le corps ne contient pas de code', () => {
    expect(errorCode(new HttpErrorResponse({ status: 500, error: 'Erreur' }))).toBe('UNKNOWN');
  });

  it("ne plante pas sur une valeur qui n'est pas une erreur HTTP", () => {
    expect(errorCode(undefined)).toBe('UNKNOWN');
    expect(errorCode(null)).toBe('UNKNOWN');
  });
});

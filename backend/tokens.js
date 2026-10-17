import { createHash, randomBytes } from 'node:crypto';

// SHA-256 : transforme un jeton en empreinte irréversible.
export const hashToken = (raw) => createHash('sha256').update(raw).digest('hex');

/**
 * Crée un jeton à usage unique.
 *  - raw  : la valeur secrète, envoyée par mail dans le lien. Jamais stockée.
 *  - hash : son empreinte, stockée en base pour pouvoir le reconnaître au retour.
 * Si la base fuit, personne ne peut reconstituer les liens à partir des empreintes.
 */
export function newToken() {
  const raw = randomBytes(32).toString('hex'); // 256 bits aléatoires : impossible à deviner
  return { raw, hash: hashToken(raw) };
}
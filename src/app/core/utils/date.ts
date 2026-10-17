/**
 * Date du jour au format AAAA-MM-JJ, en heure LOCALE.
 * (new Date().toISOString() donnerait la date en UTC : près de minuit, ce serait celle de la veille ou du lendemain.)
 */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Une date AAAA-MM-JJ est-elle comprise entre `from` et `to` (bornes incluses) ?
 *  - `from` ou `to` vide = borne ouverte (pas de limite de ce côté) ;
 *  - les deux vides = aucun filtre, tout passe ;
 *  - une date absente ne passe PAS dès qu'un filtre est actif : on ne peut pas prouver qu'elle est dans l'intervalle.
 *
 * Le format AAAA-MM-JJ a une propriété pratique : l'ordre alphabétique des chaînes est l'ordre chronologique,
 * on peut donc comparer avec < et > sans créer d'objets Date (et sans piège de fuseau horaire).
 */
export function isInDateRange(date: string | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!date) return false;
  const day = date.slice(0, 10); // tolère un horodatage complet (2026-10-08T12:00:00Z)
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
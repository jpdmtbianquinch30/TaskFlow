/** Encode une valeur pour l'URL (HttpParams laisse passer "+" tel quel, ce qui casse certains emails). */
export const enc = (value: string | number): string => encodeURIComponent(String(value));

/** Échappe les caractères spéciaux d'une chaîne avant de l'utiliser avec le filtre `_like` de json-server (c'est une RegExp). */
export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

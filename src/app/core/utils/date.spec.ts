import { isInDateRange, todayIso } from './date';

describe('date utils', () => {
  describe('todayIso', () => {
    it("formate la date locale en AAAA-MM-JJ avec des zéros devant", () => {
      expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(todayIso(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('isInDateRange', () => {
    it('laisse tout passer quand aucune borne n\'est choisie', () => {
      expect(isInDateRange('2026-10-08', '', '')).toBe(true);
      expect(isInDateRange(undefined, '', '')).toBe(true);
    });

    it('inclut les deux bornes', () => {
      expect(isInDateRange('2026-10-01', '2026-10-01', '2026-10-31')).toBe(true);
      expect(isInDateRange('2026-10-31', '2026-10-01', '2026-10-31')).toBe(true);
    });

    it('exclut les dates avant le début ou après la fin', () => {
      expect(isInDateRange('2026-09-30', '2026-10-01', '2026-10-31')).toBe(false);
      expect(isInDateRange('2026-11-01', '2026-10-01', '2026-10-31')).toBe(false);
    });

    it('accepte une seule borne', () => {
      expect(isInDateRange('2026-12-01', '2026-10-01', '')).toBe(true);
      expect(isInDateRange('2026-09-01', '2026-10-01', '')).toBe(false);
      expect(isInDateRange('2026-09-01', '', '2026-10-01')).toBe(true);
      expect(isInDateRange('2026-11-01', '', '2026-10-01')).toBe(false);
    });

    it('exclut un projet sans date dès qu\'un filtre est actif', () => {
      expect(isInDateRange(undefined, '2026-10-01', '')).toBe(false);
    });

    it('ignore l\'heure d\'un horodatage complet', () => {
      expect(isInDateRange('2026-10-31T23:59:00Z', '2026-10-01', '2026-10-31')).toBe(true);
    });

    it('ne renvoie rien quand le début est après la fin', () => {
      expect(isInDateRange('2026-10-05', '2026-10-10', '2026-10-01')).toBe(false);
      expect(isInDateRange('2026-10-15', '2026-10-10', '2026-10-01')).toBe(false);
    });
  });
});
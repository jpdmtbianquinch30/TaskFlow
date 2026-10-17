export type ProjectStatus = 'actif' | 'en_pause' | 'termine';

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
    /** Date de création au format AAAA-MM-JJ. Facultative : les anciens projets n'en ont pas. */
  createdAt?: string;
  tasksCount: number;
  /** Email (en minuscules) du créateur du projet : seul lui voit le projet dans « Mes projets » et gère ses tâches. */
  ownerEmail: string;
  ownerName: string;
}

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'en_pause', label: 'En pause' },
  { value: 'termine', label: 'Terminé' },
];

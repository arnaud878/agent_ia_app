/** Lignes reçues du backend (libellés d’avancement, sortie, erreur). */
export type NdEvent =
  | { t: 'status'; m: string }
  | { t: 'done'; output: string;[k: string]: unknown }
  | { t: 'error'; message: string }

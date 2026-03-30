import type { CorsoStato } from './types';

export const CORSO_STATO_BADGE: Record<CorsoStato, string> = {
  programmato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  attivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluso: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function getCorsoStato(dataInizio: string, dataFine: string): CorsoStato {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inizio = new Date(dataInizio);
  const fine = new Date(dataFine);
  if (inizio > today) return 'programmato';
  if (fine < today) return 'concluso';
  return 'attivo';
}

export const MATERIA_COLORS: Record<string, string> = {
  Logica:       'bg-red-500',
  Biologia:     'bg-green-500',
  Chimica:      'bg-orange-500',
  Fisica:       'bg-blue-500',
  Matematica:   'bg-blue-500',
  Simulazione:  'bg-gray-500',
  'CoCoDà':     'bg-yellow-500',
};

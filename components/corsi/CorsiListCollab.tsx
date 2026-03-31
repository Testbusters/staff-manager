import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CORSO_STATO_LABELS } from '@/lib/types';
import type { CorsoStato } from '@/lib/types';

interface CorsoWithStato {
  id: string;
  nome: string;
  codice_identificativo: string;
  modalita: 'online' | 'in_aula';
  citta: string | null;
  data_inizio: string;
  data_fine: string;
  stato: CorsoStato;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const STATO_BADGE: Record<CorsoStato, string> = {
  programmato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  attivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluso: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function CorsiListCollab({ corsi }: { corsi: CorsoWithStato[] }) {
  if (corsi.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nessun corso disponibile"
        description="Non ci sono corsi programmati o attivi per la tua community al momento."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {corsi.map((corso) => (
        <Link
          key={corso.id}
          href={`/corsi/${corso.id}`}
          className="block rounded-2xl bg-card border border-border p-5 hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{corso.nome}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{corso.codice_identificativo}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[corso.stato]}`}>
              {CORSO_STATO_LABELS[corso.stato]}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {corso.modalita === 'online' ? 'Online' : 'In aula'}
            </Badge>
            {corso.citta && (
              <Badge variant="outline" className="text-xs">{corso.citta}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {fmtDate(corso.data_inizio)} → {fmtDate(corso.data_fine)}
          </p>
        </Link>
      ))}
    </div>
  );
}

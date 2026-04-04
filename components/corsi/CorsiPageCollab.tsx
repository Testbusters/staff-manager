'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GraduationCap, BookOpen, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CORSO_STATO_LABELS } from '@/lib/types';
import type { CorsoStato } from '@/lib/types';
import type { CalEntry } from './CorsiCalendario';

const CorsiCalendario = dynamic(() => import('./CorsiCalendario'), { ssr: false });

interface CorsoFlat {
  id: string;
  nome: string;
  codice_identificativo: string;
  modalita: string;
  citta: string | null;
  data_inizio: string;
  data_fine: string;
  stato: CorsoStato;
  max_qa_per_lezione: number;
}

interface CollabAssegnazione {
  lezione_id: string;
  ruolo: string;
}

interface LezioneFlat {
  id: string;
  corso_id: string;
  data: string;
  orario_inizio: string;
  orario_fine: string;
  ore: number;
  materia: string;
}

interface Props {
  communityName: string;
  collabCitta: string | null;
  corsiAssegnati: { corso: CorsoFlat; ruoli: string[] }[];
  corsiComunita: CorsoFlat[];
  assegnazioni: CollabAssegnazione[];
  lezioni: LezioneFlat[];
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

function CorsoCard({ corso, ruoli }: { corso: CorsoFlat; ruoli?: string[] }) {
  return (
    <Link
      href={`/corsi/${corso.id}`}
      className="block rounded-2xl bg-card border border-border p-5 hover:bg-muted/60 transition-colors"
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
        {ruoli && ruoli.includes('cocoda') && (
          <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">CoCoD&apos;à</Badge>
        )}
        {ruoli && ruoli.includes('docente') && (
          <Badge className="text-xs bg-brand/10 text-brand">Docenza</Badge>
        )}
        {ruoli && ruoli.includes('qa') && (
          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Q&amp;A</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {fmtDate(corso.data_inizio)} → {fmtDate(corso.data_fine)}
      </p>
    </Link>
  );
}

export default function CorsiPageCollab({
  communityName,
  collabCitta,
  corsiAssegnati,
  corsiComunita,
  assegnazioni,
  lezioni,
}: Props) {
  // Build lookup maps
  const lezioneMap = new Map(lezioni.map((l) => [l.id, l]));
  const corsoCodeMap = new Map(corsiAssegnati.map(({ corso }) => [corso.id, corso.codice_identificativo]));

  // Calendar entries
  const calEntries: CalEntry[] = assegnazioni
    .map((a) => {
      const l = lezioneMap.get(a.lezione_id);
      if (!l) return null;
      return {
        ruolo: a.ruolo,
        data: l.data,
        orario_inizio: l.orario_inizio,
        orario_fine: l.orario_fine,
        ore: l.ore,
        corso_codice: corsoCodeMap.get(l.corso_id) ?? '—',
        corso_id: l.corso_id,
        lezione_id: l.id,
        materia: l.materia,
      };
    })
    .filter((e): e is CalEntry => e !== null);

  // Section 2: Docenza — courses in the collaborator's city (both online and in_aula)
  const corsiDocenza = collabCitta
    ? corsiComunita.filter((c) => c.citta === collabCitta)
    : [];

  // Section 3: Q&A — online courses only, with at least 1 Q&A slot available
  const corsiQA = corsiComunita.filter((c) =>
    c.modalita === 'online' && (c.max_qa_per_lezione ?? 0) >= 1
  );

  return (
    <div className="space-y-8">
      {/* Calendar */}
      {calEntries.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Calendario</h2>
          <CorsiCalendario entries={calEntries} />
        </div>
      )}

      {/* Section 1: Corsi assegnati */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          I miei corsi
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Corsi a cui sei assegnato.</p>
        {corsiAssegnati.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nessun corso assegnato"
            description="Non hai ancora assegnazioni attive."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {corsiAssegnati.map(({ corso, ruoli }) => <CorsoCard key={corso.id} corso={corso} ruoli={ruoli} />)}
          </div>
        )}
      </div>

      {/* Section 2: Docenza */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          Corsi programmati — Docenza
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {collabCitta
            ? `Corsi online + in aula a ${collabCitta} per ${communityName}.`
            : `Solo corsi online — nessuna città assegnata al profilo.`}
        </p>
        {corsiDocenza.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nessun corso disponibile"
            description="Non ci sono corsi programmati per la tua area al momento."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {corsiDocenza.map((c) => <CorsoCard key={c.id} corso={c} />)}
          </div>
        )}
      </div>

      {/* Section 3: Q&A */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Q&A programmati
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tutti i corsi programmati per {communityName} — candidature Q&A aperte.
        </p>
        {corsiQA.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title="Nessun corso disponibile"
            description="Non ci sono corsi programmati al momento."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {corsiQA.map((c) => <CorsoCard key={c.id} corso={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

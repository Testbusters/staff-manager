'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getCorsoStato } from '@/lib/corsi-utils';
import { CORSO_STATO_LABELS } from '@/lib/types';
import type { CorsoStato } from '@/lib/types';

interface Corso {
  id: string;
  nome: string;
  codice_identificativo: string;
  modalita: string;
  data_inizio: string;
  data_fine: string;
  citta?: string | null;
}

interface OwnCandidatura {
  id: string;
  corso_id: string;
  stato: string;
}

interface Props {
  corsiDisponibili: Corso[];
  mieiCorsi: Corso[];
  ownCandidature: OwnCandidatura[];
  cittaResp: string | null;
}

const STATO_BADGE: Record<CorsoStato, string> = {
  programmato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  attivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluso: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function AssegnazioneRespCittPage({ corsiDisponibili, mieiCorsi, ownCandidature, cittaResp }: Props) {
  const [candidature, setCandidature] = useState<OwnCandidatura[]>(ownCandidature);
  const [loading, setLoading] = useState<string | null>(null);

  const getCandidatura = (corsoId: string) =>
    candidature.find((c) => c.corso_id === corsoId);

  async function submitCandidatura(corsoId: string) {
    setLoading(corsoId);
    try {
      const res = await fetch('/api/candidature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'citta_corso', corso_id: corsoId }),
      });
      if (res.ok) {
        const { candidatura } = await res.json();
        setCandidature((prev) => [...prev, candidatura]);
      }
    } finally {
      setLoading(null);
    }
  }

  async function withdrawCandidatura(candidaturaId: string) {
    setLoading(candidaturaId);
    try {
      const res = await fetch(`/api/candidature/${candidaturaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: 'ritirata' }),
      });
      if (res.ok) {
        setCandidature((prev) => prev.filter((c) => c.id !== candidaturaId));
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Section 1: Corsi disponibili (no city) */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Corsi disponibili</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Corsi senza città assegnata — puoi candidare la tua città.
        </p>
        {corsiDisponibili.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nessun corso disponibile"
            description="Non ci sono corsi senza città al momento."
          />
        ) : (
          <div className="rounded-2xl bg-card border border-border overflow-hidden w-fit">
            <table className="w-auto text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Codice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Modalità</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Stato</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {corsiDisponibili.map((corso) => {
                  const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;
                  const candidatura = getCandidatura(corso.id);
                  return (
                    <tr key={corso.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{corso.codice_identificativo}</td>
                      <td className="px-4 py-3 font-medium">{corso.nome}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {corso.modalita === 'online' ? 'Online' : 'In aula'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[stato]}`}>
                          {CORSO_STATO_LABELS[stato]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {corso.data_inizio} → {corso.data_fine}
                      </td>
                      <td className="px-4 py-3">
                        {candidatura ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground italic">Candidatura inviata</span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-xs h-7">
                                  Ritira
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ritira candidatura?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sei sicuro di voler ritirare la candidatura per <strong>{corso.nome}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => withdrawCandidatura(candidatura.id)}
                                    disabled={loading === candidatura.id}
                                  >
                                    Ritira
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-brand hover:bg-brand/90 text-white text-xs h-7"
                            onClick={() => submitCandidatura(corso.id)}
                            disabled={loading === corso.id || !cittaResp}
                          >
                            Candida città
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: I miei corsi */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            I miei corsi
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Corsi assegnati alla tua città.
        </p>
        {mieiCorsi.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nessun corso assegnato"
            description={cittaResp ? `Nessun corso assegnato a ${cittaResp} al momento.` : 'Nessun corso assegnato.'}
          />
        ) : (
          <div className="rounded-2xl bg-card border border-border overflow-hidden w-fit">
            <table className="w-auto text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Codice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Modalità</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Stato</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {mieiCorsi.map((corso) => {
                  const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;
                  return (
                    <tr key={corso.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{corso.codice_identificativo}</td>
                      <td className="px-4 py-3 font-medium">{corso.nome}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {corso.modalita === 'online' ? 'Online' : 'In aula'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[stato]}`}>
                          {CORSO_STATO_LABELS[stato]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {corso.data_inizio} → {corso.data_fine}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/corsi/${corso.id}`} className="text-link hover:text-link/80 text-sm">
                          Apri
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

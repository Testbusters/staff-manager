'use client';

import { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GraduationCap } from 'lucide-react';
import { MATERIA_COLORS } from '@/lib/corsi-utils';
import type { Candidatura } from '@/lib/types';

interface Lezione {
  id: string;
  data: string;
  orario_inizio: string;
  orario_fine: string;
  materia: string;
  ore: number;
}

interface Props {
  lezioni: Lezione[];
  candidature: Candidatura[];
  collabMap: Record<string, { nome: string; cognome: string }>;
}

const TIPO_LABEL: Record<string, string> = {
  docente_lezione: 'Docente',
  qa_lezione: 'Q&A',
};

const STATO_BADGE: Record<string, string> = {
  in_attesa: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  accettata: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function LezioniTabRespCitt({ lezioni, candidature: initialCandidature, collabMap }: Props) {
  const [candidature, setCandidature] = useState<Candidatura[]>(initialCandidature);
  const [loading, setLoading] = useState<string | null>(null);

  const getCandidatureForLezione = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId);

  async function reviewCandidatura(candidaturaId: string, stato: 'accettata' | 'ritirata') {
    setLoading(candidaturaId);
    try {
      const res = await fetch(`/api/candidature/${candidaturaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato }),
      });
      if (res.ok) {
        const { candidatura } = await res.json();
        setCandidature((prev) =>
          prev.map((c) => (c.id === candidaturaId ? candidatura : c)),
        );
      }
    } finally {
      setLoading(null);
    }
  }

  if (lezioni.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nessuna lezione"
        description="Non ci sono lezioni per questo corso."
      />
    );
  }

  return (
    <div className="space-y-6">
      {lezioni.map((lezione) => {
        const lezioneCandidature = getCandidatureForLezione(lezione.id);
        const materiaStyle = MATERIA_COLORS[lezione.materia] ?? MATERIA_COLORS['default'];

        return (
          <div key={lezione.id} className="rounded-2xl bg-card border border-border overflow-hidden">
            {/* Lezione header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-sm font-medium text-foreground">{lezione.data}</span>
              <span className="text-sm text-muted-foreground">
                {lezione.orario_inizio} – {lezione.orario_fine}
              </span>
              <Badge className={`text-xs ${materiaStyle}`}>{lezione.materia}</Badge>
              <span className="text-xs text-muted-foreground">{lezione.ore}h</span>
            </div>

            {/* Candidature for this lezione */}
            {lezioneCandidature.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground italic">
                Nessuna candidatura.
              </div>
            ) : (
              <Table className="w-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Collaboratore</TableHead>
                    <TableHead className="text-xs">Ruolo</TableHead>
                    <TableHead className="text-xs">Stato</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lezioneCandidature.map((cand) => {
                    const nome = cand.collaborator_id
                      ? `${collabMap[cand.collaborator_id]?.nome ?? '—'} ${collabMap[cand.collaborator_id]?.cognome ?? ''}`.trim()
                      : '—';
                    return (
                      <TableRow key={cand.id}>
                        <TableCell className="font-medium text-sm">{nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TIPO_LABEL[cand.tipo] ?? cand.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[cand.stato] ?? ''}`}>
                            {cand.stato === 'in_attesa' ? 'In attesa' : cand.stato === 'accettata' ? 'Accettata' : cand.stato}
                          </span>
                        </TableCell>
                        <TableCell>
                          {cand.stato === 'in_attesa' && (
                            <div className="flex items-center gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="bg-brand hover:bg-brand/90 text-white text-xs h-7"
                                    disabled={loading === cand.id}
                                  >
                                    Accetta
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Accetta candidatura?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Accetti la candidatura di <strong>{nome}</strong> come {TIPO_LABEL[cand.tipo]}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => reviewCandidatura(cand.id, 'accettata')}
                                      disabled={loading === cand.id}
                                    >
                                      Accetta
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    disabled={loading === cand.id}
                                  >
                                    Rifiuta
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rifiuta candidatura?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Rifiuti la candidatura di <strong>{nome}</strong> come {TIPO_LABEL[cand.tipo]}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => reviewCandidatura(cand.id, 'ritirata')}
                                      disabled={loading === cand.id}
                                    >
                                      Rifiuta
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
}

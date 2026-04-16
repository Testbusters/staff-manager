'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MateriaBadges } from '@/components/MateriaBadges';
import { ASSEGNAZIONE_RUOLO_LABELS } from '@/lib/types';
import type { Lezione, Candidatura, Assegnazione, AssegnazioneRuolo, CandidaturaTipo, CandidaturaStato } from '@/lib/types';
import { GraduationCap, ChevronDown } from 'lucide-react';

interface Props {
  lezioni: Lezione[];
  corsoId: string;
  corsoLinea: string | null;
  corsoModalita: string;
  maxDocenti: number;
  maxQA: number;
  ownCandidature: Candidatura[];
  ownAssegnazioni: Assegnazione[];
  allAssegnazioni: Assegnazione[];
  isBlacklisted: boolean;
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function LezioniTabCollab({
  lezioni,
  corsoId,
  corsoLinea,
  corsoModalita,
  maxDocenti,
  maxQA,
  ownCandidature: initialOwnCandidature,
  ownAssegnazioni,
  allAssegnazioni,
  isBlacklisted,
}: Props) {
  const [candidature, setCandidature] = useState<Candidatura[]>(initialOwnCandidature);
  const [withdrawTarget, setWithdrawTarget] = useState<Candidatura | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // candidatura id or lezione+tipo key

  function getOwnCandidatura(lezioneId: string, tipo: CandidaturaTipo) {
    return candidature.find(
      (c) => c.lezione_id === lezioneId && c.tipo === tipo && c.stato !== 'ritirata',
    ) ?? null;
  }

  function getOwnAssegnazione(lezioneId: string) {
    return ownAssegnazioni.find((a) => a.lezione_id === lezioneId) ?? null;
  }

  function getPostiCount(lezioneId: string, ruolo: 'docente' | 'qa') {
    return allAssegnazioni.filter(
      (a) => a.lezione_id === lezioneId && a.ruolo === ruolo,
    ).length;
  }

  async function submitCandidatura(lezioneId: string, tipo: CandidaturaTipo) {
    const key = `${lezioneId}:${tipo}`;
    setLoading(key);
    try {
      const res = await fetch('/api/candidature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, lezione_id: lezioneId }),
      });
      if (res.ok) {
        const { candidatura } = await res.json();
        setCandidature((prev) => [...prev, candidatura]);
        toast.success('Candidatura inviata');
      }
    } finally {
      setLoading(null);
    }
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return;
    const id = withdrawTarget.id;
    setLoading(id);
    setWithdrawTarget(null);
    try {
      const res = await fetch(`/api/candidature/${id}`, { method: 'PATCH' });
      if (res.ok) {
        const { candidatura } = await res.json();
        setCandidature((prev) => prev.map((c) => (c.id === id ? candidatura : c)));
        toast.success('Candidatura ritirata');
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
        description="Non ci sono lezioni programmate per questo corso."
      />
    );
  }

  return (
    <>
      {isBlacklisted && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-400/30 bg-yellow-50 dark:bg-yellow-900/10 px-4 py-3 mb-6 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Sei in blacklist — non puoi presentare candidature per questo corso.</span>
        </div>
      )}

      <div className="rounded-2xl bg-card border border-border overflow-hidden w-full">
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Orario</TableHead>
              <TableHead>Ore</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Linea</TableHead>
              <TableHead>La tua partecipazione</TableHead>
              <TableHead>Docente <span className="font-normal text-muted-foreground text-xs">(posti)</span></TableHead>
              {corsoModalita === 'online' && (
                <TableHead>Q&amp;A <span className="font-normal text-muted-foreground text-xs">(posti)</span></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lezioni.map((lezione) => {
              const assegnazione = getOwnAssegnazione(lezione.id);
              const candidaturaDocente = getOwnCandidatura(lezione.id, 'docente_lezione');
              const candidaturaQA = getOwnCandidatura(lezione.id, 'qa_lezione');
              const isAssigned = !!assegnazione;
              const postiDocente = getPostiCount(lezione.id, 'docente');
              const postiQA = getPostiCount(lezione.id, 'qa');

              return (
                <TableRow key={lezione.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDate(lezione.data)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatTime(lezione.orario_inizio)} – {formatTime(lezione.orario_fine)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground text-center">{Number(lezione.ore).toFixed(1)}</TableCell>
                  <TableCell>
                    <MateriaBadges materie={lezione.materie} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {corsoLinea ?? '—'}
                  </TableCell>

                  {/* Partecipazione column */}
                  <TableCell>
                    {isAssigned ? (
                      <Badge variant="secondary">
                        Assegnato · {ASSEGNAZIONE_RUOLO_LABELS[assegnazione.ruolo as AssegnazioneRuolo]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Docente candidatura column */}
                  <TableCell>
                    <div className="space-y-1">
                      <CandidaturaCell
                        candidatura={candidaturaDocente}
                        tipo="docente_lezione"
                        lezioneId={lezione.id}
                        isBlacklisted={isBlacklisted}
                        isAssigned={isAssigned}
                        isLoading={loading === `${lezione.id}:docente_lezione` || loading === candidaturaDocente?.id}
                        onSubmit={() => submitCandidatura(lezione.id, 'docente_lezione')}
                        onWithdraw={() => setWithdrawTarget(candidaturaDocente)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {postiDocente}/{maxDocenti} assegnati
                      </p>
                    </div>
                  </TableCell>

                  {/* Q&A candidatura column */}
                  {corsoModalita === 'online' && (
                    <TableCell>
                      <div className="space-y-1">
                        <CandidaturaCell
                          candidatura={candidaturaQA}
                          tipo="qa_lezione"
                          lezioneId={lezione.id}
                          isBlacklisted={isBlacklisted}
                          isAssigned={isAssigned}
                          isLoading={loading === `${lezione.id}:qa_lezione` || loading === candidaturaQA?.id}
                          onSubmit={() => submitCandidatura(lezione.id, 'qa_lezione')}
                          onWithdraw={() => setWithdrawTarget(candidaturaQA)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {postiQA}/{maxQA} assegnati
                        </p>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!withdrawTarget} onOpenChange={(open) => { if (!open) setWithdrawTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ritira candidatura</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler ritirare questa candidatura? L&apos;operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdraw} className="bg-destructive hover:bg-destructive/90 text-white">
              Ritira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CandidaturaCell({
  candidatura,
  tipo,
  lezioneId,
  isBlacklisted,
  isAssigned,
  isLoading,
  onSubmit,
  onWithdraw,
}: {
  candidatura: Candidatura | null;
  tipo: CandidaturaTipo;
  lezioneId: string;
  isBlacklisted: boolean;
  isAssigned: boolean;
  isLoading: boolean;
  onSubmit: () => void;
  onWithdraw: (c: Candidatura) => void;
}) {
  const label = tipo === 'docente_lezione' ? 'Docente' : 'Q&A';

  if (candidatura) {
    if (candidatura.stato === 'in_attesa') {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs whitespace-nowrap">In attesa</Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            disabled={isLoading}
            onClick={() => onWithdraw(candidatura)}
            aria-label={`Ritira candidatura ${label}`}
          >
            Ritira
          </Button>
        </div>
      );
    }
    if (candidatura.stato === 'accettata') {
      return <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Accettata</Badge>;
    }
  }

  const disabled = isBlacklisted || isAssigned || isLoading;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-3 text-xs"
      disabled={disabled}
      onClick={onSubmit}
      aria-label={`Candidati come ${label}`}
    >
      {isLoading ? '…' : label}
    </Button>
  );
}

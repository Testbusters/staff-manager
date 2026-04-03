'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { MATERIA_COLORS } from '@/lib/corsi-utils';
import type { Candidatura, CandidaturaStato, Lezione } from '@/lib/types';

interface CollabOption {
  id: string;
  nome: string;
  cognome: string;
  username?: string | null;
}

interface DocenteAssegnazione {
  id: string;
  lezione_id: string;
  collaborator_id: string;
}

interface Props {
  lezioni: Lezione[];
  candidature: Candidatura[];
  collabMap: Record<string, { nome: string; cognome: string }>;
  maxDocenti: number;
  maxQA: number;
  blacklistedIds: Set<string>;
  collabMetadata: Record<string, { materie: string[]; citta: string; qaSvolti: number }>;
  collabsPerCitta: CollabOption[];
  docenteAssegnazioni: DocenteAssegnazione[];
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const TIPO_LABEL: Record<string, string> = {
  docente_lezione: 'Docente',
  qa_lezione: 'Q&A',
};

const STATO_BADGE: Record<string, string> = {
  in_attesa: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  accettata: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function LezioniTabRespCitt({
  lezioni,
  candidature: initialCandidature,
  collabMap,
  maxDocenti,
  maxQA,
  blacklistedIds,
  collabMetadata,
  collabsPerCitta,
  docenteAssegnazioni: initialDocenteAssegnazioni,
}: Props) {
  const [candidature, setCandidature] = useState<Candidatura[]>(initialCandidature);
  const [docenteAssegnazioni, setDocenteAssegnazioni] = useState<DocenteAssegnazione[]>(initialDocenteAssegnazioni);
  const [loading, setLoading] = useState<string | null>(null);
  // per-lezione state for docente assignment
  const [docenteSearch, setDocenteSearch] = useState<Record<string, string>>({});
  const [selectedDocente, setSelectedDocente] = useState<Record<string, string>>({});
  const [assigningDocente, setAssigningDocente] = useState<string | null>(null);

  const getCandidatureForLezione = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId);

  const acceptedQACount = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId && c.tipo === 'qa_lezione' && c.stato === 'accettata').length;

  const acceptedDocenteCount = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId && c.tipo === 'docente_lezione' && c.stato === 'accettata').length;

  const docenteAssegnazioniForLezione = (lezioneId: string) =>
    docenteAssegnazioni.filter((a) => a.lezione_id === lezioneId);

  function filteredCollabs(lezioneId: string): CollabOption[] {
    const search = (docenteSearch[lezioneId] ?? '').toLowerCase();
    const existing = new Set(docenteAssegnazioniForLezione(lezioneId).map((a) => a.collaborator_id));
    return collabsPerCitta.filter((c) => {
      if (existing.has(c.id)) return false;
      if (!search) return true;
      const full = `${c.nome} ${c.cognome} ${c.username ?? ''}`.toLowerCase();
      return full.includes(search);
    });
  }

  async function reviewCandidatura(candidaturaId: string, stato: CandidaturaStato) {
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
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        toast.error(error ?? 'Operazione fallita');
      }
    } finally {
      setLoading(null);
    }
  }

  async function assignDocente(lezioneId: string) {
    const collaboratorId = selectedDocente[lezioneId];
    if (!collaboratorId) return;
    setAssigningDocente(lezioneId);
    try {
      const res = await fetch('/api/assegnazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lezione_id: lezioneId, collaborator_id: collaboratorId, ruolo: 'docente' }),
      });
      if (res.ok) {
        const { assegnazione } = await res.json();
        setDocenteAssegnazioni((prev) => [...prev, assegnazione]);
        setSelectedDocente((prev) => ({ ...prev, [lezioneId]: '' }));
        setDocenteSearch((prev) => ({ ...prev, [lezioneId]: '' }));
        toast.success('Docente assegnato');
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        toast.error(error ?? 'Assegnazione fallita');
      }
    } finally {
      setAssigningDocente(null);
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
      {/* Capacity info */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Docenti max: {maxDocenti}</Badge>
        <Badge variant="outline" className="text-xs">Q&A max: {maxQA}</Badge>
      </div>

      <div className="inline-flex flex-col gap-6">
      {lezioni.map((lezione) => {
        const lezioneCandidature = getCandidatureForLezione(lezione.id);
        const materiaStyle = MATERIA_COLORS[lezione.materia] ?? 'bg-gray-500';
        const qaAccettati = acceptedQACount(lezione.id);
        const docenteAccettati = acceptedDocenteCount(lezione.id);
        const docenteDiretti = docenteAssegnazioniForLezione(lezione.id);
        const qaAtLimit = maxQA > 0 && qaAccettati >= maxQA;
        const docenteAtLimit = maxDocenti > 0 && (docenteAccettati + docenteDiretti.length) >= maxDocenti;
        const filtered = filteredCollabs(lezione.id);

        return (
          <div key={lezione.id} className="rounded-2xl bg-card border border-border overflow-hidden w-full">
            {/* Lezione header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-sm font-medium text-foreground">{fmtDate(lezione.data)}</span>
              <span className="text-sm text-muted-foreground">
                {lezione.orario_inizio} – {lezione.orario_fine}
              </span>
              <Badge className={`text-xs ${materiaStyle}`}>{lezione.materia}</Badge>
              <span className="text-xs text-muted-foreground">{lezione.ore}h</span>
              {/* Counters */}
              <div className="ml-auto flex items-center gap-2">
                {maxQA > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${qaAtLimit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    Q&A {qaAccettati}/{maxQA}
                  </span>
                )}
                {maxDocenti > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${docenteAtLimit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    Docenti {docenteAccettati + docenteDiretti.length}/{maxDocenti}
                  </span>
                )}
              </div>
            </div>

            {/* Docente diretti (via assegnazione diretta) */}
            {docenteDiretti.length > 0 && (
              <div className="px-4 py-2 border-b border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Docenti assegnati direttamente:</p>
                <div className="flex flex-wrap gap-1">
                  {docenteDiretti.map((a) => {
                    const collab = collabsPerCitta.find((c) => c.id === a.collaborator_id);
                    const nome = collab ? `${collab.nome} ${collab.cognome}` : a.collaborator_id;
                    return (
                      <Badge key={a.id} variant="outline" className="text-xs">
                        {nome}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Candidature for this lezione */}
            {lezioneCandidature.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground italic">
                Nessuna candidatura.
              </div>
            ) : (
              <Table className="w-auto">
                <TableHeader>
                  <TableRow className="bg-muted/40">
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
                    const isBlacklisted = cand.collaborator_id ? blacklistedIds.has(cand.collaborator_id) : false;
                    const meta = cand.collaborator_id ? collabMetadata[cand.collaborator_id] : null;
                    const isQA = cand.tipo === 'qa_lezione';
                    const isDocente = cand.tipo === 'docente_lezione';
                    const acceptDisabled =
                      loading === cand.id ||
                      (isQA && qaAtLimit) ||
                      (isDocente && docenteAtLimit);

                    return (
                      <TableRow key={cand.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span>{nome}</span>
                              {isBlacklisted && (
                                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                  Blacklist
                                </Badge>
                              )}
                            </div>
                            {isQA && meta && (
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                {meta.materie.map((m) => (
                                  <span
                                    key={m}
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${MATERIA_COLORS[m] ?? 'bg-gray-500'}`}
                                  >
                                    {m}
                                  </span>
                                ))}
                                {meta.citta && (
                                  <span className="text-muted-foreground text-xs">{meta.citta}</span>
                                )}
                                <span className="text-muted-foreground text-xs">Q&A svolti: {meta.qaSvolti}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
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
                                    variant="outline"
                                    className="text-xs h-7"
                                    disabled={acceptDisabled}
                                    title={
                                      isQA && qaAtLimit ? `Limite Q&A raggiunto (${maxQA})` :
                                      isDocente && docenteAtLimit ? `Limite docenti raggiunto (${maxDocenti})` :
                                      undefined
                                    }
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
                          {cand.stato === 'accettata' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  disabled={loading === cand.id}
                                >
                                  Revoca
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoca candidatura?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Rimettere la candidatura di <strong>{nome}</strong> in attesa di revisione?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => reviewCandidatura(cand.id, 'in_attesa')}
                                    disabled={loading === cand.id}
                                  >
                                    Revoca
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Assegna docente direttamente */}
            {collabsPerCitta.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/10">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assegna docente direttamente</p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Cerca collaboratore..."
                    value={docenteSearch[lezione.id] ?? ''}
                    onChange={(e) => setDocenteSearch((prev) => ({ ...prev, [lezione.id]: e.target.value }))}
                    className="h-8 text-xs w-48"
                  />
                  <select
                    className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground min-w-[160px]"
                    value={selectedDocente[lezione.id] ?? ''}
                    onChange={(e) => setSelectedDocente((prev) => ({ ...prev, [lezione.id]: e.target.value }))}
                  >
                    <option value="">Seleziona...</option>
                    {filtered.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.cognome}{c.username ? ` (${c.username})` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    disabled={!selectedDocente[lezione.id] || assigningDocente === lezione.id || docenteAtLimit}
                    onClick={() => assignDocente(lezione.id)}
                    title={docenteAtLimit ? `Limite docenti raggiunto (${maxDocenti})` : undefined}
                  >
                    {assigningDocente === lezione.id ? 'Assegnando...' : 'Assegna'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

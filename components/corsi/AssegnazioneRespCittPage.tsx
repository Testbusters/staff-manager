'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { GraduationCap, MapPin, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { getCorsoStato, CORSO_STATO_BADGE } from '@/lib/corsi-utils';
import { CORSO_STATO_LABELS } from '@/lib/types';
import type { CorsoStato, Lezione } from '@/lib/types';

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

type CorsoLezione = Pick<Lezione, 'id' | 'corso_id' | 'data' | 'orario_inizio' | 'orario_fine' | 'materia'>;

interface CollabOption {
  id: string;
  nome: string;
  cognome: string;
}

interface CocodaAssegnazione {
  id: string;
  lezione_id: string;
  collaborator_id: string;
}

interface Props {
  corsiDisponibili: Corso[];
  mieiCorsi: Corso[];
  ownCandidature: OwnCandidatura[];
  cittaResp: string | null;
  mieiCorsiLezioni: CorsoLezione[];
  collabsPerCocoda: CollabOption[];
  cocodaAssegnazioni: CocodaAssegnazione[];
  blacklistedIds: Set<string>;
}

interface CocodaPanelProps {
  lezioni: CorsoLezione[];
  collabsPerCocoda: CollabOption[];
  collabMap: Map<string, CollabOption>;
  cocodaAssegnazioni: CocodaAssegnazione[];
  loading: string | null;
  blacklistedIds: Set<string>;
  selectedCollabMap: Record<string, string>;
  onAssign: (lezioneId: string) => void;
  onRemove: (assegnazioneId: string) => void;
  onSelectCollab: (lezioneId: string, collabId: string) => void;
}

function CocodaPanel({
  lezioni,
  collabsPerCocoda,
  collabMap,
  cocodaAssegnazioni,
  loading,
  blacklistedIds,
  selectedCollabMap,
  onAssign,
  onRemove,
  onSelectCollab,
}: CocodaPanelProps) {
  function getCocodaAssegnazione(lezioneId: string) {
    return cocodaAssegnazioni.find((a) => a.lezione_id === lezioneId);
  }

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground mb-3">
        Assegnazione CoCoD&apos;à per lezione
      </p>
      <div className="space-y-2">
        {lezioni.map((lezione) => {
          const existing = getCocodaAssegnazione(lezione.id);
          const existingCollab = existing ? collabMap.get(existing.collaborator_id) : null;
          const isAssigning = loading === `assign-${lezione.id}`;

          return (
            <div key={lezione.id} className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground whitespace-nowrap w-24 shrink-0">
                {lezione.data}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {lezione.orario_inizio}–{lezione.orario_fine}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">{lezione.materia}</Badge>
              {existing ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Assegnato:{' '}
                    <strong>
                      {existingCollab
                        ? `${existingCollab.nome} ${existingCollab.cognome}`
                        : existing.collaborator_id}
                    </strong>
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        disabled={loading === `remove-${existing.id}`}
                      >
                        Rimuovi
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rimuovi CoCoD&apos;à?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Rimuovere l&apos;assegnazione di{' '}
                          <strong>
                            {existingCollab
                              ? `${existingCollab.nome} ${existingCollab.cognome}`
                              : 'questo collaboratore'}
                          </strong>{' '}
                          come CoCoD&apos;à?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onRemove(existing.id)}
                          disabled={loading === `remove-${existing.id}`}
                        >
                          Rimuovi
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedCollabMap[lezione.id] ?? ''}
                    onValueChange={(val) => onSelectCollab(lezione.id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs w-48">
                      <SelectValue placeholder="Seleziona collaboratore" />
                    </SelectTrigger>
                    <SelectContent>
                      {collabsPerCocoda.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.cognome} {c.nome}{blacklistedIds.has(c.id) ? ' ⚠ Blacklist' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    disabled={!selectedCollabMap[lezione.id] || isAssigning}
                    onClick={() => onAssign(lezione.id)}
                  >
                    Assegna
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AssegnazioneRespCittPage({
  corsiDisponibili,
  mieiCorsi,
  ownCandidature,
  cittaResp,
  mieiCorsiLezioni,
  collabsPerCocoda,
  cocodaAssegnazioni: initialCocodaAssegnazioni,
  blacklistedIds,
}: Props) {
  const [candidature, setCandidature] = useState<OwnCandidatura[]>(ownCandidature);
  const [cocodaAssegnazioni, setCocodaAssegnazioni] = useState<CocodaAssegnazione[]>(initialCocodaAssegnazioni);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedCorsoId, setExpandedCorsoId] = useState<string | null>(null);
  const [selectedCollabMap, setSelectedCollabMap] = useState<Record<string, string>>({});

  const getCandidatura = (corsoId: string) =>
    candidature.find((c) => c.corso_id === corsoId);

  // Group lezioni by corso
  const lezioniByCorso = mieiCorsiLezioni.reduce<Record<string, CorsoLezione[]>>((acc, l) => {
    if (!acc[l.corso_id]) acc[l.corso_id] = [];
    acc[l.corso_id].push(l);
    return acc;
  }, {});

  const collabMap = new Map(collabsPerCocoda.map((c) => [c.id, c]));

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
        toast.success('Candidatura città inviata');
      } else {
        toast.error('Errore durante l\'invio della candidatura.');
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
      } else {
        toast.error('Errore durante il ritiro della candidatura.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function removeAssegnazione(assegnazioneId: string) {
    setLoading(`remove-${assegnazioneId}`);
    try {
      const res = await fetch(`/api/assegnazioni/${assegnazioneId}`, { method: 'DELETE' });
      if (res.ok) {
        setCocodaAssegnazioni((prev) => prev.filter((a) => a.id !== assegnazioneId));
      } else {
        toast.error('Errore durante la rimozione dell\'assegnazione.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function assignCocoda(lezioneId: string) {
    const collaboratorId = selectedCollabMap[lezioneId];
    if (!collaboratorId) return;
    setLoading(`assign-${lezioneId}`);
    try {
      const res = await fetch('/api/assegnazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lezione_id: lezioneId, collaborator_id: collaboratorId, ruolo: 'cocoda' }),
      });
      if (res.ok) {
        const { assegnazione } = await res.json();
        setCocodaAssegnazioni((prev) => [...prev, assegnazione]);
        setSelectedCollabMap((prev) => {
          const next = { ...prev };
          delete next[lezioneId];
          return next;
        });
      } else {
        toast.error('Errore durante l\'assegnazione CoCoD\'à.');
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-14">
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
          <div className="overflow-x-auto">
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs w-[145px]">Codice</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs w-[90px]">Modalità</TableHead>
                    <TableHead className="text-xs w-[120px]">Stato</TableHead>
                    <TableHead className="text-xs w-[175px]">Date</TableHead>
                    <TableHead className="text-xs w-[195px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {corsiDisponibili.map((corso) => {
                    const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;
                    const candidatura = getCandidatura(corso.id);
                    return (
                      <TableRow key={corso.id} className="hover:bg-muted/60">
                        <TableCell className="font-mono text-xs text-muted-foreground">{corso.codice_identificativo}</TableCell>
                        <TableCell className="font-medium truncate" title={corso.nome}>{corso.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {corso.modalita === 'online' ? 'Online' : 'In aula'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CORSO_STATO_BADGE[stato]}`}>
                            {CORSO_STATO_LABELS[stato]}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {corso.data_inizio} → {corso.data_fine}
                        </TableCell>
                        <TableCell>
                          {candidatura ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Candidatura inviata</Badge>
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  disabled={loading === corso.id || !cittaResp}
                                >
                                  Candida città
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Candidatura città</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Vuoi inviare la candidatura di <strong>{cittaResp}</strong> per il corso <strong>{corso.nome}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => submitCandidatura(corso.id)}>
                                    Candida
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
          </div>
          </div>
        )}
      </div>

      {/* Section 2: I miei corsi — with CoCoD'à accordion */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          I miei corsi
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
          <div className="space-y-3">
            {mieiCorsi.map((corso) => {
              const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;
              const lezioni = lezioniByCorso[corso.id] ?? [];
              const isExpanded = expandedCorsoId === corso.id;
              const hasLezioni = lezioni.length > 0;
              const hasCollabs = collabsPerCocoda.length > 0;
              const canExpand = hasLezioni && hasCollabs;

              return (
                <div key={corso.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                  {/* Corso row */}
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{corso.codice_identificativo}</span>
                      <span className="font-medium text-sm truncate">{corso.nome}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {corso.modalita === 'online' ? 'Online' : 'In aula'}
                      </Badge>
                      <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${CORSO_STATO_BADGE[stato]}`}>
                        {CORSO_STATO_LABELS[stato]}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {corso.data_inizio} → {corso.data_fine}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Link href={`/corsi/${corso.id}`} className="text-link hover:text-link/80 text-sm">
                        Apri
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        aria-label="Esporta assegnazioni CSV"
                        onClick={() => { window.location.href = `/api/assegnazioni/export?corso_id=${corso.id}`; }}
                      >
                        <Download className="h-3 w-3" />
                        Export
                      </Button>
                      {canExpand && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => setExpandedCorsoId(isExpanded ? null : corso.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          CoCoD&apos;à
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* CoCoD'à panel */}
                  {isExpanded && (
                    <CocodaPanel
                      lezioni={lezioni}
                      collabsPerCocoda={collabsPerCocoda}
                      collabMap={collabMap}
                      cocodaAssegnazioni={cocodaAssegnazioni}
                      loading={loading}
                      blacklistedIds={blacklistedIds}
                      selectedCollabMap={selectedCollabMap}
                      onAssign={assignCocoda}
                      onRemove={removeAssegnazione}
                      onSelectCollab={(lezioneId, val) =>
                        setSelectedCollabMap((prev) => ({ ...prev, [lezioneId]: val }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

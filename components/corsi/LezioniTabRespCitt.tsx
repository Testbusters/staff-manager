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
import { MateriaBadges } from '@/components/MateriaBadges';
import type { Candidatura, CandidaturaStato, Lezione } from '@/lib/types';

interface CollabOption {
  id: string;
  nome: string;
  cognome: string;
  username?: string | null;
}

interface RuoloAssegnazione {
  id: string;
  lezione_id: string;
  collaborator_id: string;
}

interface Props {
  corsoId: string;
  lezioni: Lezione[];
  candidature: Candidatura[];
  collabMap: Record<string, { nome: string; cognome: string; username?: string | null }>;
  maxDocenti: number;
  maxQA: number;
  blacklistedIds: Set<string>;
  collabMetadata: Record<string, { materie: string[]; citta: string; qaSvolti: number }>;
  collabsPerCitta: CollabOption[];
  docenteAssegnazioni: RuoloAssegnazione[];
  cocodaAssegnazioni: RuoloAssegnazione[];
  qaAssegnazioni: RuoloAssegnazione[];
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const MAX_COCODA = 2;

const TIPO_LABEL: Record<string, string> = {
  docente_lezione: 'Docente',
  qa_lezione: 'Q&A',
};

const STATO_BADGE: Record<string, string> = {
  in_attesa: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  accettata: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function collabLabel(c: CollabOption, blacklisted: boolean): string {
  const base = `${c.cognome} ${c.nome}${c.username ? ` (${c.username})` : ''}`;
  return blacklisted ? `${base} ⚠` : base;
}

export default function LezioniTabRespCitt({
  corsoId,
  lezioni,
  candidature: initialCandidature,
  collabMap,
  maxDocenti,
  maxQA,
  blacklistedIds,
  collabMetadata,
  collabsPerCitta,
  docenteAssegnazioni: initialDocenteAssegnazioni,
  cocodaAssegnazioni: initialCocodaAssegnazioni,
  qaAssegnazioni: initialQaAssegnazioni,
}: Props) {
  const [candidature, setCandidature] = useState<Candidatura[]>(initialCandidature);
  const [docenteAssegnazioni, setDocenteAssegnazioni] = useState<RuoloAssegnazione[]>(initialDocenteAssegnazioni);
  const [cocodaAssegnazioni, setCocodaAssegnazioni] = useState<RuoloAssegnazione[]>(initialCocodaAssegnazioni);
  const [qaAssegnazioni, setQaAssegnazioni] = useState<RuoloAssegnazione[]>(initialQaAssegnazioni);
  const [loading, setLoading] = useState<string | null>(null);

  // Per-lezione state for docente direct assignment
  const [docenteSearch, setDocenteSearch] = useState<Record<string, string>>({});
  const [selectedDocente, setSelectedDocente] = useState<Record<string, string>>({});
  const [assigningDocente, setAssigningDocente] = useState<string | null>(null);

  // Per-lezione state for Q&A direct assignment
  const [qaSearch, setQaSearch] = useState<Record<string, string>>({});
  const [selectedQA, setSelectedQA] = useState<Record<string, string>>({});
  const [assigningQA, setAssigningQA] = useState<string | null>(null);

  // Bulk assignment state
  const [bulkSlots, setBulkSlots] = useState<Record<string, string>>({});
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  // --- Derived data ---

  const getCandidatureForLezione = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId);

  const acceptedQACount = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId && c.tipo === 'qa_lezione' && c.stato === 'accettata').length;

  const acceptedDocenteCount = (lezioneId: string) =>
    candidature.filter((c) => c.lezione_id === lezioneId && c.tipo === 'docente_lezione' && c.stato === 'accettata').length;

  const docenteAssegnazioniForLezione = (lezioneId: string) =>
    docenteAssegnazioni.filter((a) => a.lezione_id === lezioneId);

  const qaAssegnazioniForLezione = (lezioneId: string) =>
    qaAssegnazioni.filter((a) => a.lezione_id === lezioneId);

  // Corso-level unique collaborators for bulk sections
  const corsoCocodaCollabs = [...new Set(cocodaAssegnazioni.map((a) => a.collaborator_id))];
  const corsoDocenteCollabs = [...new Set(docenteAssegnazioni.map((a) => a.collaborator_id))];

  // --- Filters ---

  function filteredCollabs(lezioneId: string, ruolo: 'docente' | 'qa'): CollabOption[] {
    const search = ruolo === 'docente'
      ? (docenteSearch[lezioneId] ?? '').toLowerCase()
      : (qaSearch[lezioneId] ?? '').toLowerCase();
    const existingIds = ruolo === 'docente'
      ? new Set(docenteAssegnazioniForLezione(lezioneId).map((a) => a.collaborator_id))
      : new Set(qaAssegnazioniForLezione(lezioneId).map((a) => a.collaborator_id));
    return collabsPerCitta.filter((c) => {
      if (existingIds.has(c.id)) return false;
      if (!search) return true;
      const full = `${c.nome} ${c.cognome} ${c.username ?? ''}`.toLowerCase();
      return full.includes(search);
    });
  }

  // --- Actions ---

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

  async function assignPerLezione(lezioneId: string, ruolo: 'docente' | 'qa') {
    const collaboratorId = ruolo === 'docente' ? selectedDocente[lezioneId] : selectedQA[lezioneId];
    if (!collaboratorId) return;
    const setAssigning = ruolo === 'docente' ? setAssigningDocente : setAssigningQA;
    setAssigning(lezioneId);
    try {
      const res = await fetch('/api/assegnazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lezione_id: lezioneId, collaborator_id: collaboratorId, ruolo }),
      });
      if (res.ok) {
        const { assegnazione } = await res.json();
        if (ruolo === 'docente') {
          setDocenteAssegnazioni((prev) => [...prev, assegnazione]);
          setSelectedDocente((prev) => ({ ...prev, [lezioneId]: '' }));
          setDocenteSearch((prev) => ({ ...prev, [lezioneId]: '' }));
        } else {
          setQaAssegnazioni((prev) => [...prev, assegnazione]);
          setSelectedQA((prev) => ({ ...prev, [lezioneId]: '' }));
          setQaSearch((prev) => ({ ...prev, [lezioneId]: '' }));
        }
        toast.success(`${ruolo === 'docente' ? 'Docente' : 'Q&A'} assegnato`);
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        toast.error(error ?? 'Assegnazione fallita');
      }
    } finally {
      setAssigning(null);
    }
  }

  async function assignCorsoRuolo(ruolo: 'cocoda' | 'docente') {
    const max = ruolo === 'cocoda' ? MAX_COCODA : maxDocenti;
    const existing = ruolo === 'cocoda' ? corsoCocodaCollabs : corsoDocenteCollabs;
    const ids: string[] = [];
    for (let i = 0; i < max - existing.length; i++) {
      const val = bulkSlots[`${ruolo}|${i}`];
      if (val) ids.push(val);
    }
    if (ids.length === 0) return;

    setBulkLoading(ruolo);
    try {
      const res = await fetch('/api/assegnazioni/corso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corso_id: corsoId, collaborator_ids: ids, ruolo }),
      });
      if (res.ok) {
        const { created } = await res.json();
        // Refresh: add new assegnazioni to local state
        const newAssegnazioni: RuoloAssegnazione[] = [];
        for (const lezione of lezioni) {
          for (const collabId of ids) {
            newAssegnazioni.push({
              id: `${lezione.id}-${collabId}-${ruolo}`,
              lezione_id: lezione.id,
              collaborator_id: collabId,
            });
          }
        }
        if (ruolo === 'cocoda') {
          setCocodaAssegnazioni((prev) => {
            const existingKeys = new Set(prev.map((a) => `${a.lezione_id}|${a.collaborator_id}`));
            return [...prev, ...newAssegnazioni.filter((a) => !existingKeys.has(`${a.lezione_id}|${a.collaborator_id}`))];
          });
        } else {
          setDocenteAssegnazioni((prev) => {
            const existingKeys = new Set(prev.map((a) => `${a.lezione_id}|${a.collaborator_id}`));
            return [...prev, ...newAssegnazioni.filter((a) => !existingKeys.has(`${a.lezione_id}|${a.collaborator_id}`))];
          });
        }
        // Clear bulk slots
        const clearedSlots: Record<string, string> = {};
        for (let i = 0; i < max; i++) clearedSlots[`${ruolo}|${i}`] = '';
        setBulkSlots((prev) => ({ ...prev, ...clearedSlots }));
        toast.success(`${created} assegnazioni create`);
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        toast.error(error ?? 'Assegnazione fallita');
      }
    } finally {
      setBulkLoading(null);
    }
  }

  async function removeAssegnazione(assegnazioneId: string, ruolo: 'cocoda' | 'docente' | 'qa') {
    setLoading(assegnazioneId);
    try {
      const res = await fetch(`/api/assegnazioni/${assegnazioneId}`, { method: 'DELETE' });
      if (res.ok) {
        if (ruolo === 'cocoda') {
          setCocodaAssegnazioni((prev) => prev.filter((a) => a.id !== assegnazioneId));
        } else if (ruolo === 'docente') {
          setDocenteAssegnazioni((prev) => prev.filter((a) => a.id !== assegnazioneId));
        } else {
          setQaAssegnazioni((prev) => prev.filter((a) => a.id !== assegnazioneId));
        }
        toast.success('Assegnazione rimossa');
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        toast.error(error ?? 'Rimozione fallita');
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

  // Build taken sets for bulk dropdowns
  const cocodaTaken = new Set(corsoCocodaCollabs);
  const docenteTaken = new Set(corsoDocenteCollabs);
  for (let i = 0; i < MAX_COCODA - corsoCocodaCollabs.length; i++) {
    const v = bulkSlots[`cocoda|${i}`];
    if (v) cocodaTaken.add(v);
  }
  for (let i = 0; i < maxDocenti - corsoDocenteCollabs.length; i++) {
    const v = bulkSlots[`docente|${i}`];
    if (v) docenteTaken.add(v);
  }

  return (
    <div className="space-y-6">
      {/* Capacity info */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Docenti max: {maxDocenti}</Badge>
        <Badge variant="outline" className="text-xs">Q&A max: {maxQA}</Badge>
        <Badge variant="outline" className="text-xs">CoCoD&apos;a max: {MAX_COCODA}</Badge>
      </div>

      {/* Bulk assignment sections */}
      {collabsPerCitta.length > 0 && (
        <div className="space-y-4">
          {/* CoCoDa bulk */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">CoCoD&apos;a - Assegnazione corso</h3>
            {corsoCocodaCollabs.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {corsoCocodaCollabs.map((collabId) => {
                  const c = collabsPerCitta.find((x) => x.id === collabId);
                  const label = c ? `${c.cognome} ${c.nome}` : collabId;
                  return (
                    <Badge key={collabId} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            )}
            {corsoCocodaCollabs.length < MAX_COCODA && (
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from({ length: MAX_COCODA - corsoCocodaCollabs.length }, (_, i) => {
                  const slotKey = `cocoda|${i}`;
                  return (
                    <select
                      key={slotKey}
                      className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground min-w-[180px]"
                      value={bulkSlots[slotKey] ?? ''}
                      onChange={(e) => setBulkSlots((prev) => ({ ...prev, [slotKey]: e.target.value }))}
                    >
                      <option value="">CoCoD&apos;a {i + 1 + corsoCocodaCollabs.length}...</option>
                      {collabsPerCitta.filter((c) => !cocodaTaken.has(c.id) || bulkSlots[slotKey] === c.id).map((c) => (
                        <option key={c.id} value={c.id}>
                          {collabLabel(c, blacklistedIds.has(c.id))}
                        </option>
                      ))}
                    </select>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  disabled={bulkLoading === 'cocoda' || !Array.from({ length: MAX_COCODA - corsoCocodaCollabs.length }, (_, i) => bulkSlots[`cocoda|${i}`]).some(Boolean)}
                  onClick={() => assignCorsoRuolo('cocoda')}
                >
                  {bulkLoading === 'cocoda' ? 'Assegnando...' : 'Assegna a tutte le lezioni'}
                </Button>
              </div>
            )}
            {corsoCocodaCollabs.length >= MAX_COCODA && (
              <p className="text-xs text-muted-foreground">Tutti gli slot CoCoD&apos;a sono assegnati.</p>
            )}
          </div>

          {/* Docente bulk */}
          {maxDocenti > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Docenti - Assegnazione corso</h3>
              {corsoDocenteCollabs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {corsoDocenteCollabs.map((collabId) => {
                    const c = collabsPerCitta.find((x) => x.id === collabId);
                    const label = c ? `${c.cognome} ${c.nome}` : collabId;
                    return (
                      <Badge key={collabId} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              )}
              {corsoDocenteCollabs.length < maxDocenti && (
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: Math.min(maxDocenti - corsoDocenteCollabs.length, 4) }, (_, i) => {
                    const slotKey = `docente|${i}`;
                    return (
                      <select
                        key={slotKey}
                        className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground min-w-[180px]"
                        value={bulkSlots[slotKey] ?? ''}
                        onChange={(e) => setBulkSlots((prev) => ({ ...prev, [slotKey]: e.target.value }))}
                      >
                        <option value="">Docente {i + 1 + corsoDocenteCollabs.length}...</option>
                        {collabsPerCitta.filter((c) => !docenteTaken.has(c.id) || bulkSlots[slotKey] === c.id).map((c) => (
                          <option key={c.id} value={c.id}>
                            {collabLabel(c, blacklistedIds.has(c.id))}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    disabled={bulkLoading === 'docente' || !Array.from({ length: Math.min(maxDocenti - corsoDocenteCollabs.length, 4) }, (_, i) => bulkSlots[`docente|${i}`]).some(Boolean)}
                    onClick={() => assignCorsoRuolo('docente')}
                  >
                    {bulkLoading === 'docente' ? 'Assegnando...' : 'Assegna a tutte le lezioni'}
                  </Button>
                </div>
              )}
              {corsoDocenteCollabs.length >= maxDocenti && (
                <p className="text-xs text-muted-foreground">Tutti gli slot docente sono assegnati a livello corso.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Per-lezione list */}
      <div className="inline-flex flex-col gap-6">
      {lezioni.map((lezione) => {
        const lezioneCandidature = getCandidatureForLezione(lezione.id);
        const qaAccettati = acceptedQACount(lezione.id);
        const docenteAccettati = acceptedDocenteCount(lezione.id);
        const docenteDiretti = docenteAssegnazioniForLezione(lezione.id);
        const qaDiretti = qaAssegnazioniForLezione(lezione.id);
        const qaAtLimit = maxQA > 0 && (qaAccettati + qaDiretti.length) >= maxQA;
        const docenteAtLimit = maxDocenti > 0 && (docenteAccettati + docenteDiretti.length) >= maxDocenti;
        const filteredDocente = filteredCollabs(lezione.id, 'docente');
        const filteredQA = filteredCollabs(lezione.id, 'qa');

        return (
          <div key={lezione.id} className="rounded-2xl bg-card border border-border overflow-hidden w-full">
            {/* Lezione header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-sm font-medium text-foreground">{fmtDate(lezione.data)}</span>
              <span className="text-sm text-muted-foreground">
                {lezione.orario_inizio} - {lezione.orario_fine}
              </span>
              <MateriaBadges materie={lezione.materie} />
              <span className="text-xs text-muted-foreground">{lezione.ore}h</span>
              {/* Counters */}
              <div className="ml-auto flex items-center gap-2">
                {maxQA > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${qaAtLimit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    Q&A {qaAccettati + qaDiretti.length}/{maxQA}
                  </span>
                )}
                {maxDocenti > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${docenteAtLimit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    Docenti {docenteAccettati + docenteDiretti.length}/{maxDocenti}
                  </span>
                )}
              </div>
            </div>

            {/* Assigned CoCoDa for this lezione */}
            {cocodaAssegnazioni.filter((a) => a.lezione_id === lezione.id).length > 0 && (
              <div className="px-4 py-2 border-b border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">CoCoD&apos;a assegnati:</p>
                <div className="flex flex-wrap gap-1">
                  {cocodaAssegnazioni.filter((a) => a.lezione_id === lezione.id).map((a) => {
                    const c = collabsPerCitta.find((x) => x.id === a.collaborator_id);
                    const nome = c ? `${c.nome} ${c.cognome}` : a.collaborator_id;
                    return (
                      <div key={a.id} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{nome}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          disabled={loading === a.id}
                          onClick={() => removeAssegnazione(a.id, 'cocoda')}
                          aria-label={`Rimuovi ${nome}`}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assigned docenti for this lezione */}
            {docenteDiretti.length > 0 && (
              <div className="px-4 py-2 border-b border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Docenti assegnati:</p>
                <div className="flex flex-wrap gap-1">
                  {docenteDiretti.map((a) => {
                    const c = collabsPerCitta.find((x) => x.id === a.collaborator_id);
                    const nome = c ? `${c.nome} ${c.cognome}` : a.collaborator_id;
                    return (
                      <div key={a.id} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{nome}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          disabled={loading === a.id}
                          onClick={() => removeAssegnazione(a.id, 'docente')}
                          aria-label={`Rimuovi ${nome}`}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assigned Q&A for this lezione */}
            {qaDiretti.length > 0 && (
              <div className="px-4 py-2 border-b border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Q&A assegnati:</p>
                <div className="flex flex-wrap gap-1">
                  {qaDiretti.map((a) => {
                    const c = collabsPerCitta.find((x) => x.id === a.collaborator_id);
                    const nome = c ? `${c.nome} ${c.cognome}` : a.collaborator_id;
                    return (
                      <div key={a.id} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{nome}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          disabled={loading === a.id}
                          onClick={() => removeAssegnazione(a.id, 'qa')}
                          aria-label={`Rimuovi ${nome}`}
                        >
                          ×
                        </Button>
                      </div>
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
                    const username = cand.collaborator_id ? collabMap[cand.collaborator_id]?.username : null;
                    const displayName = username ? `${nome} (${username})` : nome;
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
                              <span>{displayName}</span>
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
                                      Accetti la candidatura di <strong>{displayName}</strong> come {TIPO_LABEL[cand.tipo]}?
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
                                      Rifiuti la candidatura di <strong>{displayName}</strong> come {TIPO_LABEL[cand.tipo]}?
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
                                    Rimettere la candidatura di <strong>{displayName}</strong> in attesa di revisione?
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

            {/* Assign docente directly per lezione */}
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
                    className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground min-w-[180px]"
                    value={selectedDocente[lezione.id] ?? ''}
                    onChange={(e) => setSelectedDocente((prev) => ({ ...prev, [lezione.id]: e.target.value }))}
                  >
                    <option value="">Seleziona...</option>
                    {filteredDocente.map((c) => (
                      <option key={c.id} value={c.id}>
                        {collabLabel(c, blacklistedIds.has(c.id))}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    disabled={!selectedDocente[lezione.id] || assigningDocente === lezione.id || docenteAtLimit}
                    onClick={() => assignPerLezione(lezione.id, 'docente')}
                    title={docenteAtLimit ? `Limite docenti raggiunto (${maxDocenti})` : undefined}
                  >
                    {assigningDocente === lezione.id ? 'Assegnando...' : 'Assegna'}
                  </Button>
                </div>
              </div>
            )}

            {/* Assign Q&A directly per lezione */}
            {collabsPerCitta.length > 0 && maxQA > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/10">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assegna Q&A direttamente</p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Cerca collaboratore..."
                    value={qaSearch[lezione.id] ?? ''}
                    onChange={(e) => setQaSearch((prev) => ({ ...prev, [lezione.id]: e.target.value }))}
                    className="h-8 text-xs w-48"
                  />
                  <select
                    className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground min-w-[180px]"
                    value={selectedQA[lezione.id] ?? ''}
                    onChange={(e) => setSelectedQA((prev) => ({ ...prev, [lezione.id]: e.target.value }))}
                  >
                    <option value="">Seleziona...</option>
                    {filteredQA.map((c) => (
                      <option key={c.id} value={c.id}>
                        {collabLabel(c, blacklistedIds.has(c.id))}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    disabled={!selectedQA[lezione.id] || assigningQA === lezione.id || qaAtLimit}
                    onClick={() => assignPerLezione(lezione.id, 'qa')}
                    title={qaAtLimit ? `Limite Q&A raggiunto (${maxQA})` : undefined}
                  >
                    {assigningQA === lezione.id ? 'Assegnando...' : 'Assegna'}
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

'use client';

import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ValutazioneEntry {
  collaborator_id: string;
  nome: string;
  cognome: string;
  ruolo: 'docente' | 'cocoda';
  materia: string | null;
  assegnazioniIds: string[];
  totalLezioni: number;
  assignedLezioni: number;
  thresholdMet: boolean;
  valutazione: number | null;
}

interface CorsoValutazioni {
  corso: { id: string; nome: string; codice: string };
  entries: ValutazioneEntry[];
}

interface Props {
  corsiValutazioni: CorsoValutazioni[];
}

function entryKey(corsoId: string, e: ValutazioneEntry): string {
  return `${corsoId}:${e.collaborator_id}:${e.ruolo}:${e.materia ?? '__all__'}`;
}

export default function ValutazioniRespCittPage({ corsiValutazioni }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const cv of corsiValutazioni) {
      for (const e of cv.entries) {
        init[entryKey(cv.corso.id, e)] = e.valutazione !== null ? String(e.valutazione) : '';
      }
    }
    return init;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  async function saveValutazione(corsoId: string, entry: ValutazioneEntry) {
    const key = entryKey(corsoId, entry);
    const raw = values[key] ?? '';
    const val = parseFloat(raw);
    if (isNaN(val) || val < 1 || val > 10) return;

    setSaving((prev) => ({ ...prev, [key]: true }));
    setSaved((prev) => ({ ...prev, [key]: false }));

    try {
      const res = await fetch(`/api/corsi/${corsoId}/valutazioni`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaborator_id: entry.collaborator_id,
          ruolo: entry.ruolo,
          materia: entry.materia ?? undefined,
          valutazione: val,
        }),
      });
      if (res.ok) {
        setSaved((prev) => ({ ...prev, [key]: true }));
        toast.success('Valutazione salvata');
      } else {
        toast.error('Errore nel salvataggio');
      }
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  // Group entries by ruolo section, then by materia for docente
  function renderCorsoEntries(corsoId: string, entries: ValutazioneEntry[]) {
    const cocodaEntries = entries.filter((e) => e.ruolo === 'cocoda');
    const docenteEntries = entries.filter((e) => e.ruolo === 'docente');

    // Group docente by materia
    const materieOrder: string[] = [];
    const docenteByMateria = new Map<string, ValutazioneEntry[]>();
    for (const e of docenteEntries) {
      const mat = e.materia ?? 'Senza materia';
      if (!docenteByMateria.has(mat)) {
        materieOrder.push(mat);
        docenteByMateria.set(mat, []);
      }
      docenteByMateria.get(mat)!.push(e);
    }

    const totalCols = 5;

    return (
      <Table className="w-auto">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs">Collaboratore</TableHead>
            <TableHead className="text-xs">Ruolo</TableHead>
            <TableHead className="text-xs">Copertura</TableHead>
            <TableHead className="text-xs">Valutazione (1-10)</TableHead>
            <TableHead className="text-xs"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* CoCoDa section */}
          {cocodaEntries.length > 0 && (
            <>
              <TableRow>
                <TableCell colSpan={totalCols} className="bg-muted/20 py-1.5 text-xs font-semibold text-muted-foreground">
                  CoCoD&apos;a
                </TableCell>
              </TableRow>
              {cocodaEntries.map((entry) => renderEntryRow(corsoId, entry))}
            </>
          )}

          {/* Docente section - grouped by materia */}
          {materieOrder.map((materia) => (
            <Fragment key={materia}>
              <TableRow>
                <TableCell colSpan={totalCols} className="bg-muted/20 py-1.5 text-xs font-semibold text-muted-foreground">
                  Docente - {materia}
                </TableCell>
              </TableRow>
              {docenteByMateria.get(materia)!.map((entry) => renderEntryRow(corsoId, entry))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    );
  }

  function renderEntryRow(corsoId: string, entry: ValutazioneEntry) {
    const key = entryKey(corsoId, entry);
    const isSaving = saving[key];
    const wasSaved = saved[key];
    const rawVal = values[key] ?? '';
    const numVal = parseFloat(rawVal);
    const isValid = !isNaN(numVal) && numVal >= 1 && numVal <= 10;
    const pct = entry.totalLezioni > 0
      ? Math.round((entry.assignedLezioni / entry.totalLezioni) * 100)
      : 0;

    return (
      <TableRow key={key}>
        <TableCell className="font-medium whitespace-nowrap">
          {entry.cognome} {entry.nome}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {entry.ruolo === 'cocoda' ? "CoCoD'a" : 'Docente'}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {entry.thresholdMet ? (
            <span className="text-xs text-green-600 dark:text-green-400">
              {entry.assignedLezioni}/{entry.totalLezioni} ({pct}%)
            </span>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {entry.assignedLezioni}/{entry.totalLezioni} ({pct}%)
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Copertura sotto l&apos;80% - valutazione bloccata
              </TooltipContent>
            </Tooltip>
          )}
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min={1}
            max={10}
            step={0.5}
            value={rawVal}
            disabled={!entry.thresholdMet}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [key]: e.target.value }))
            }
            className={`w-24 h-8 text-sm ${rawVal && !isValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            placeholder={entry.thresholdMet ? 'es. 8' : '-'}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => saveValutazione(corsoId, entry)}
              disabled={isSaving || !isValid || !entry.thresholdMet}
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
            {wasSaved && !isSaving && (
              <span className="text-xs text-green-600 dark:text-green-400">✓</span>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-8">
      {corsiValutazioni.map((cv) => (
        <div key={cv.corso.id}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-foreground">{cv.corso.nome}</h2>
            <Badge variant="outline" className="font-mono text-xs">{cv.corso.codice}</Badge>
          </div>

          <div className="w-fit rounded-2xl bg-card border border-border overflow-hidden">
            {renderCorsoEntries(cv.corso.id, cv.entries)}
          </div>
        </div>
      ))}
    </div>
  );
}

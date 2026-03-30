'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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

interface CollabValutazione {
  collaborator_id: string;
  nome: string;
  cognome: string;
  assegnazioniIds: string[];
  valutazione: number | null;
}

interface CorsoValutazioni {
  corso: { id: string; nome: string; codice: string };
  collabs: CollabValutazione[];
}

interface Props {
  corsiValutazioni: CorsoValutazioni[];
}

export default function ValutazioniRespCittPage({ corsiValutazioni }: Props) {
  // State: per corso, per collab → valutazione value + saved/loading status
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const cv of corsiValutazioni) {
      init[cv.corso.id] = {};
      for (const c of cv.collabs) {
        init[cv.corso.id][c.collaborator_id] = c.valutazione !== null ? String(c.valutazione) : '';
      }
    }
    return init;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const saveKey = (corsoId: string, collabId: string) => `${corsoId}:${collabId}`;

  async function saveValutazione(corsoId: string, collabId: string) {
    const raw = values[corsoId]?.[collabId] ?? '';
    const val = parseFloat(raw);
    if (isNaN(val) || val < 1 || val > 10) return;

    const key = saveKey(corsoId, collabId);
    setSaving((prev) => ({ ...prev, [key]: true }));
    setSaved((prev) => ({ ...prev, [key]: false }));

    try {
      const res = await fetch(`/api/corsi/${corsoId}/valutazioni`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborator_id: collabId, valutazione: val }),
      });
      if (res.ok) {
        setSaved((prev) => ({ ...prev, [key]: true }));
        toast.success('Valutazione salvata');
      }
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
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
              <Table className="w-auto">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Collaboratore</TableHead>
                    <TableHead className="text-xs">Valutazione (1–10)</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cv.collabs.map((collab) => {
                    const key = saveKey(cv.corso.id, collab.collaborator_id);
                    const isSaving = saving[key];
                    const wasSaved = saved[key];
                    const rawVal = values[cv.corso.id]?.[collab.collaborator_id] ?? '';
                    const numVal = parseFloat(rawVal);
                    const isValid = !isNaN(numVal) && numVal >= 1 && numVal <= 10;

                    return (
                      <TableRow key={collab.collaborator_id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {collab.nome} {collab.cognome}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            value={rawVal}
                            onChange={(e) =>
                              setValues((prev) => ({
                                ...prev,
                                [cv.corso.id]: {
                                  ...prev[cv.corso.id],
                                  [collab.collaborator_id]: e.target.value,
                                },
                              }))
                            }
                            className={`w-24 h-8 text-sm ${rawVal && !isValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                            placeholder="es. 8"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => saveValutazione(cv.corso.id, collab.collaborator_id)}
                              disabled={isSaving || !isValid}
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
                  })}
                </TableBody>
              </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

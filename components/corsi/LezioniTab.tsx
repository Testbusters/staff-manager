'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarDays } from 'lucide-react';
import { MATERIA_COLORS } from '@/lib/corsi-utils';
import type { Lezione } from '@/lib/types';

interface Props {
  corsoId: string;
  initialLezioni: Lezione[];
  materieList: string[];
}

interface LezioneForm {
  data: string;
  orario_inizio: string;
  orario_fine: string;
  materia: string;
}

const empty: LezioneForm = { data: '', orario_inizio: '', orario_fine: '', materia: '' };

export default function LezioniTab({ corsoId, initialLezioni, materieList }: Props) {
  const [lezioni, setLezioni] = useState<Lezione[]>(initialLezioni);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Lezione | null>(null);
  const [form, setForm] = useState<LezioneForm>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, materia: materieList[0] ?? '' });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(l: Lezione) {
    setEditing(l);
    setForm({
      data: l.data,
      orario_inizio: l.orario_inizio.slice(0, 5),
      orario_fine: l.orario_fine.slice(0, 5),
      materia: l.materia,
    });
    setError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
    setForm(empty);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = editing
        ? `/api/corsi/${corsoId}/lezioni/${editing.id}`
        : `/api/corsi/${corsoId}/lezioni`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Errore durante il salvataggio');
        return;
      }
      if (editing) {
        setLezioni((prev) => prev.map((l) => (l.id === editing.id ? json.lezione : l)));
      } else {
        setLezioni((prev) => [...prev, json.lezione]);
      }
      closeSheet();
    } catch {
      setError('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/corsi/${corsoId}/lezioni/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLezioni((prev) => prev.filter((l) => l.id !== id));
    }
    setDeleteId(null);
  }

  const set = (key: keyof LezioneForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{lezioni.length} lezioni totali</p>
        <Button onClick={openCreate} className="bg-brand hover:bg-brand/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi lezione
        </Button>
      </div>

      {lezioni.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nessuna lezione"
          description="Aggiungi la prima lezione con il pulsante in alto a destra."
        />
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden w-fit">
          <Table className="w-auto">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Orario</TableHead>
                <TableHead>Ore</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lezioni.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/60">
                  <TableCell className="whitespace-nowrap">{l.data}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {l.orario_inizio.slice(0, 5)} – {l.orario_fine.slice(0, 5)}
                  </TableCell>
                  <TableCell className="text-center">{l.ore}h</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${MATERIA_COLORS[l.materia] ?? 'bg-gray-400'}`}
                      />
                      {l.materia}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Modifica lezione"
                        onClick={() => openEdit(l)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Elimina lezione"
                        className="text-destructive hover:text-destructive/80"
                        onClick={() => setDeleteId(l.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Modifica lezione' : 'Nuova lezione'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data *</label>
              <Input type="date" value={form.data} onChange={set('data')} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Orario inizio *</label>
              <Input type="time" value={form.orario_inizio} onChange={set('orario_inizio')} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Orario fine *</label>
              <Input type="time" value={form.orario_fine} onChange={set('orario_fine')} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Materia *</label>
              <Select
                value={form.materia}
                onValueChange={(v) => setForm((f) => ({ ...f, materia: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona materia" />
                </SelectTrigger>
                <SelectContent>
                  {materieList.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.data || !form.orario_inizio || !form.orario_fine || !form.materia}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                {saving ? 'Salvataggio…' : editing ? 'Salva' : 'Aggiungi'}
              </Button>
              <Button variant="outline" onClick={closeSheet}>Annulla</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina lezione</AlertDialogTitle>
            <AlertDialogDescription>
              Questa operazione è irreversibile. La lezione e tutte le assegnazioni correlate saranno eliminate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import RichTextEditor from '@/components/ui/RichTextEditor';
import type { ContentEvent, EventTipo } from '@/lib/types';

const TIPO_COLORS: Record<EventTipo, string> = {
  Convention:       'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400',
  Attivita_interna: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  Workshop:         'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400',
  Formazione:       'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
  Altro:            'bg-muted border-border text-muted-foreground',
};

const TIPO_LABELS: Record<EventTipo, string> = {
  Convention:       'Convention',
  Attivita_interna: 'Attività interna',
  Workshop:         'Workshop',
  Formazione:       'Formazione',
  Altro:            'Altro',
};

const TIPO_OPTIONS: { value: EventTipo; label: string }[] = [
  { value: 'Convention',       label: 'Convention' },
  { value: 'Attivita_interna', label: 'Attività interna' },
  { value: 'Workshop',         label: 'Workshop' },
  { value: 'Formazione',       label: 'Formazione' },
  { value: 'Altro',            label: 'Altro' },
];

interface FormData {
  titolo: string;
  descrizione: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  luma_url: string;
  tipo: string;
}

const EMPTY_FORM: FormData = {
  titolo: '', descrizione: '', start_datetime: '', end_datetime: '',
  location: '', luma_url: '', tipo: '',
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  initialEvents: ContentEvent[];
  citta: string;
}

export default function EventiCittaPage({ initialEvents, citta }: Props) {
  const [events, setEvents] = useState<ContentEvent[]>(initialEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentEvent | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentEvent | null>(null);

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(ev: ContentEvent) {
    setEditing(ev);
    setForm({
      titolo: ev.titolo,
      descrizione: ev.descrizione ?? '',
      start_datetime: toDatetimeLocal(ev.start_datetime),
      end_datetime: toDatetimeLocal(ev.end_datetime),
      location: ev.location ?? '',
      luma_url: ev.luma_url ?? '',
      tipo: ev.tipo ?? '',
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim()) {
      toast.error('Il titolo è obbligatorio.', { duration: 5000 });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/events/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titolo: form.titolo,
            descrizione: form.descrizione || null,
            start_datetime: form.start_datetime || null,
            end_datetime: form.end_datetime || null,
            location: form.location || null,
            luma_url: form.luma_url || null,
            tipo: form.tipo || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Errore');
        const { event: updated } = await res.json();
        setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
        toast.success('Evento aggiornato.');
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titolo: form.titolo,
            descrizione: form.descrizione || null,
            start_datetime: form.start_datetime || null,
            end_datetime: form.end_datetime || null,
            location: form.location || null,
            luma_url: form.luma_url || null,
            tipo: form.tipo || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Errore');
        const { event: created } = await res.json();
        setEvents((prev) => [created, ...prev]);
        toast.success('Evento creato.');
      }
      closeDialog();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto.', { duration: 5000 });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/events/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Errore');
      setEvents((prev) => prev.filter((ev) => ev.id !== deleteTarget.id));
      toast.success('Evento eliminato.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto.', { duration: 5000 });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">
            Eventi di {citta}
          </h1>
        </div>
        <Button onClick={openNew} className="bg-brand hover:bg-brand/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo evento
        </Button>
      </div>

      {/* List */}
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`Nessun evento per ${citta}`}
          description="Crea il primo evento per questa città."
        />
      ) : (
        <div className="w-fit max-w-full rounded-lg border border-border bg-card overflow-x-auto">
          <Table className="w-auto">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Data inizio</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Luogo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((ev) => (
                <TableRow key={ev.id} className="hover:bg-muted/60">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(ev.start_datetime)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {ev.titolo}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ev.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {ev.location}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {ev.tipo ? (
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIPO_COLORS[ev.tipo as EventTipo] ?? TIPO_COLORS.Altro}`}>
                        {TIPO_LABELS[ev.tipo as EventTipo] ?? ev.tipo}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Modifica evento"
                        onClick={() => openEdit(ev)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Elimina evento"
                        onClick={() => setDeleteTarget(ev)}
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-10">
              {editing ? 'Modifica evento' : `Nuovo evento — ${citta}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4 pt-2 overflow-y-auto max-h-[60vh] pr-1">
              <div className="space-y-1">
                <label htmlFor="evento-titolo" className="text-sm font-medium text-foreground">Titolo *</label>
                <Input id="evento-titolo" value={form.titolo} onChange={set('titolo')} placeholder="Nome dell'evento" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="evento-start" className="text-sm font-medium text-foreground">Data inizio</label>
                  <Input id="evento-start" type="datetime-local" value={form.start_datetime} onChange={set('start_datetime')} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="evento-end" className="text-sm font-medium text-foreground">Data fine</label>
                  <Input id="evento-end" type="datetime-local" value={form.end_datetime} onChange={set('end_datetime')} />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="evento-luogo" className="text-sm font-medium text-foreground">Luogo</label>
                <Input id="evento-luogo" value={form.location} onChange={set('location')} placeholder="Es. Online, Milano — Via Roma 1" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Descrizione</label>
                <RichTextEditor
                  value={form.descrizione}
                  onChange={(v) => setForm((f) => ({ ...f, descrizione: v }))}
                  placeholder="Descrizione dell'evento"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="evento-luma" className="text-sm font-medium text-foreground">Link Luma</label>
                <Input id="evento-luma" value={form.luma_url} onChange={set('luma_url')} placeholder="https://lu.ma/..." />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                Annulla
              </Button>
              <Button type="submit" className="bg-brand hover:bg-brand/90 text-white" disabled={saving}>
                {saving ? 'Salvataggio…' : editing ? 'Aggiorna evento' : 'Salva evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina evento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare &ldquo;{deleteTarget?.titolo}&rdquo;? L&rsquo;operazione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

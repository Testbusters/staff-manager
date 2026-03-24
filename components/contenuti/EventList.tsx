'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { ContentEvent, EventTipo, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIPO_OPTIONS: { value: EventTipo; label: string }[] = [
  { value: 'Convention',       label: 'Convention' },
  { value: 'Attivita_interna', label: 'Attività interna' },
  { value: 'Workshop',         label: 'Workshop' },
  { value: 'Formazione',       label: 'Formazione' },
  { value: 'Altro',            label: 'Altro' },
];

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

interface FormData {
  titolo: string;
  descrizione: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  luma_url: string;
  luma_embed_url: string;
  community_ids: string[];
  tipo: string;
  file_url: string;
}

function EventForm({
  initial,
  communities,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial?: Partial<FormData>;
  communities: Community[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<FormData>({
    titolo: initial?.titolo ?? '',
    descrizione: initial?.descrizione ?? '',
    start_datetime: initial?.start_datetime ?? '',
    end_datetime: initial?.end_datetime ?? '',
    location: initial?.location ?? '',
    luma_url: initial?.luma_url ?? '',
    luma_embed_url: initial?.luma_embed_url ?? '',
    community_ids: initial?.community_ids ?? [],
    tipo: initial?.tipo ?? '',
    file_url: initial?.file_url ?? '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRich = (k: keyof FormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim()) { toast.error('Il titolo è obbligatorio.', { duration: 5000 }); return; }
    setLoading(true);
    try { await onSave(form); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Errore.', { duration: 5000 }); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Titolo <span className="text-destructive">*</span></label>
        <Input value={form.titolo} onChange={set('titolo')} placeholder="Nome dell'evento" required />
      </div>
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data/ora inizio</label>
          <Input type="datetime-local" value={form.start_datetime} onChange={set('start_datetime')} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data/ora fine</label>
          <Input type="datetime-local" value={form.end_datetime} onChange={set('end_datetime')} />
        </div>
      </div>
      <Input value={form.location} onChange={set('location')} placeholder="Luogo (es. Online, Milano)" />
      <Input value={form.luma_url} onChange={set('luma_url')} placeholder="URL pagina Luma" type="url" />
      <Input value={form.luma_embed_url} onChange={set('luma_embed_url')} placeholder="URL embed Luma (per iframe)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tipo evento</label>
          <Select value={form.tipo || undefined} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue placeholder="— Nessun tipo —" /></SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input value={form.file_url} onChange={set('file_url')} placeholder="URL file allegato" className="self-end" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Community (vuoto = tutte)</label>
        <div className="flex flex-wrap gap-3">
          {communities.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
              <Checkbox
                checked={form.community_ids.includes(c.id)}
                onCheckedChange={(v) => setForm((f) => ({
                  ...f,
                  community_ids: v
                    ? [...f.community_ids, c.id]
                    : f.community_ids.filter((id) => id !== c.id),
                }))}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Annulla</Button>
        <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90 text-white">
          {loading ? 'Salvataggio…' : (submitLabel ?? 'Salva')}
        </Button>
      </DialogFooter>
    </form>
  );
}

const PAGE_SIZE = 20;

function PaginationNav({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPage(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="text-xs text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            onClick={() => onPage(page + 1)}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function EventList({
  events,
  canWrite,
  communities,
}: {
  events: ContentEvent[];
  canWrite: boolean;
  communities: Community[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const editingItem = editingId ? events.find((e) => e.id === editingId) : null;

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        descrizione: data.descrizione || undefined,
        start_datetime: data.start_datetime || null,
        end_datetime: data.end_datetime || null,
        location: data.location || null,
        luma_url: data.luma_url || null,
        luma_embed_url: data.luma_embed_url || null,
        community_ids: data.community_ids,
        tipo: data.tipo || null,
        file_url: data.file_url || null,
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Evento pubblicato.');
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        descrizione: data.descrizione || null,
        start_datetime: data.start_datetime || null,
        end_datetime: data.end_datetime || null,
        location: data.location || null,
        luma_url: data.luma_url || null,
        luma_embed_url: data.luma_embed_url || null,
        community_ids: data.community_ids,
        tipo: data.tipo || null,
        file_url: data.file_url || null,
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Evento aggiornato.');
    setEditingId(null);
    router.refresh();
  }

  async function doDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/events/${deleteTarget}`, { method: 'DELETE' });
    toast.success('Eliminato.');
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo evento</DialogTitle>
          </DialogHeader>
          <EventForm
            communities={communities}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Pubblica"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica evento</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <EventForm
              initial={{
                titolo: editingItem.titolo,
                descrizione: editingItem.descrizione ?? '',
                start_datetime: toDatetimeLocal(editingItem.start_datetime),
                end_datetime: toDatetimeLocal(editingItem.end_datetime),
                location: editingItem.location ?? '',
                luma_url: editingItem.luma_url ?? '',
                luma_embed_url: editingItem.luma_embed_url ?? '',
                community_ids: editingItem.community_ids ?? [],
                tipo: editingItem.tipo ?? '',
                file_url: editingItem.file_url ?? '',
              }}
              communities={communities}
              onSave={(data) => handleEdit(editingItem.id, data)}
              onCancel={() => setEditingId(null)}
              submitLabel="Aggiorna"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina evento</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminare questo evento? L&apos;operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} variant="destructive">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)} className="bg-brand hover:bg-brand/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo evento
          </Button>
        </div>
      )}

      {events.length === 0 && (
        <EmptyState icon={CalendarDays} title="Nessun evento in programma" description="Non ci sono eventi pubblicati al momento." />
      )}
      {events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ev) => (
        <div key={ev.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{ev.titolo}</h3>
              {ev.citta && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  📍 {ev.citta}
                </span>
              )}
            </div>
            {canWrite && (
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(ev.id)} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">Modifica</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(ev.id)} className="h-auto p-0 text-xs text-red-600 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300">Elimina</Button>
              </div>
            )}
          </div>
          {ev.descrizione && <div className="line-clamp-3 overflow-hidden"><RichTextDisplay html={ev.descrizione} /></div>}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {(ev.start_datetime || ev.end_datetime) && (
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDateRange(ev.start_datetime, ev.end_datetime)}</span>
            )}
            {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{ev.location}</span>}
            {ev.luma_url && (
              <a href={ev.luma_url} target="_blank" rel="noopener noreferrer"
                className="text-link hover:text-link/80 underline transition">
                Pagina evento →
              </a>
            )}
          </div>
          {ev.luma_embed_url && (
            <div className="rounded-xl overflow-hidden border border-border mt-1">
              <iframe
                src={ev.luma_embed_url}
                className="w-full h-64 border-0"
                title={ev.titolo}
                loading="lazy"
                allow="fullscreen"
              />
            </div>
          )}
        </div>
      ))}
      <PaginationNav page={page} total={events.length} onPage={setPage} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Tag, Paperclip, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Discount, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryBadge(valid_to: string | null) {
  if (!valid_to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(valid_to);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Scaduto</span>;
  if (diffDays <= 7) return <span className="rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300">In scadenza</span>;
  return <span className="rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">Attivo</span>;
}

interface FormData {
  titolo: string;
  descrizione: string;
  codice_sconto: string;
  link: string;
  valid_from: string;
  valid_to: string;
  community_ids: string[];
  fornitore: string;
  logo_url: string;
  file_url: string;
}

function DiscountForm({
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
    codice_sconto: initial?.codice_sconto ?? '',
    link: initial?.link ?? '',
    valid_from: initial?.valid_from ?? '',
    valid_to: initial?.valid_to ?? '',
    community_ids: initial?.community_ids ?? [],
    fornitore: initial?.fornitore ?? '',
    logo_url: initial?.logo_url ?? '',
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
      <Input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required />
      <Input value={form.fornitore} onChange={set('fornitore')} placeholder="Fornitore (es. Amazon, MediaWorld)" />
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input value={form.codice_sconto} onChange={set('codice_sconto')} placeholder="Codice sconto" />
        <Input value={form.link} onChange={set('link')} placeholder="Link (URL)" type="url" />
        <Input value={form.logo_url} onChange={set('logo_url')} placeholder="URL logo fornitore" />
        <Input value={form.file_url} onChange={set('file_url')} placeholder="URL file allegato" />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valido dal</label>
          <Input type="date" value={form.valid_from} onChange={set('valid_from')} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valido fino al</label>
          <Input type="date" value={form.valid_to} onChange={set('valid_to')} />
        </div>
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

function isActive(d: Discount): boolean {
  if (!d.valid_to) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(d.valid_to) >= today;
}

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

export default function DiscountList({
  discounts,
  canWrite,
  communities,
  brand = 'testbusters',
}: {
  discounts: Discount[];
  canWrite: boolean;
  communities: Community[];
  brand?: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const editingItem = editingId ? discounts.find((d) => d.id === editingId) : null;
  const active = discounts.filter(isActive);
  const expired = discounts.filter((d) => !isActive(d));
  const sorted = [...active, ...expired];
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageActive = pageItems.filter(isActive);
  const pageExpired = pageItems.filter((d) => !isActive(d));

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids, brand }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Sconto pubblicato.');
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/discounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids, brand }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Sconto aggiornato.');
    setEditingId(null);
    router.refresh();
  }

  async function doDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/discounts/${deleteTarget}`, { method: 'DELETE' });
    toast.success('Eliminato.');
    setDeleteTarget(null);
    router.refresh();
  }

  function renderCard(d: Discount, expired: boolean) {
    return (
      <div key={d.id} className={`rounded-xl border p-4 space-y-2 ${expired ? 'border-border bg-card/50 opacity-70' : 'border-border bg-card'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{d.titolo}</h3>
            {d.fornitore && <span className="text-xs text-muted-foreground">· {d.fornitore}</span>}
            {expiryBadge(d.valid_to)}
          </div>
          {canWrite && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditingId(d.id)} className="text-xs text-muted-foreground hover:text-foreground transition">Modifica</button>
              <button onClick={() => setDeleteTarget(d.id)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 transition">Elimina</button>
            </div>
          )}
        </div>
        {d.descrizione && <div className="line-clamp-3 overflow-hidden"><RichTextDisplay html={d.descrizione} /></div>}
        <div className="flex items-center gap-3 flex-wrap">
          {d.codice_sconto && (
            <span className="rounded-md bg-muted border border-border px-2 py-0.5 text-xs font-mono text-yellow-700 dark:text-yellow-300">
              {d.codice_sconto}
            </span>
          )}
          {d.link && (
            <a href={d.link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-link hover:text-link/80 underline transition">
              Scopri →
            </a>
          )}
          {d.file_url && (
            <a href={d.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-2 py-0.5 text-xs text-foreground transition">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />Allegato
            </a>
          )}
          {(d.valid_from || d.valid_to) && (
            <span className="text-xs text-muted-foreground">
              {d.valid_from && `Dal ${formatDate(d.valid_from)}`}
              {d.valid_from && d.valid_to && ' · '}
              {d.valid_to && `Al ${formatDate(d.valid_to)}`}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuovo sconto</DialogTitle>
          </DialogHeader>
          <DiscountForm
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
            <DialogTitle>Modifica sconto</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <DiscountForm
              initial={{
                titolo: editingItem.titolo, descrizione: editingItem.descrizione ?? '', codice_sconto: editingItem.codice_sconto ?? '',
                link: editingItem.link ?? '', valid_from: editingItem.valid_from ?? '', valid_to: editingItem.valid_to ?? '',
                community_ids: editingItem.community_ids ?? [], fornitore: editingItem.fornitore ?? '',
                logo_url: editingItem.logo_url ?? '', file_url: editingItem.file_url ?? '',
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
            <AlertDialogTitle>Elimina sconto</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminare questo sconto? L&apos;operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)} className="bg-brand hover:bg-brand/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo sconto
          </Button>
        </div>
      )}

      {discounts.length === 0 && (
        <EmptyState icon={Tag} title="Nessuno sconto disponibile" description="Non ci sono sconti pubblicati al momento." />
      )}
      {pageActive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attivi</h2>
          {pageActive.map((d) => renderCard(d, false))}
        </div>
      )}
      {pageExpired.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scaduti</h2>
          {pageExpired.map((d) => renderCard(d, true))}
        </div>
      )}
      <PaginationNav page={page} total={sorted.length} onPage={setPage} />
    </div>
  );
}

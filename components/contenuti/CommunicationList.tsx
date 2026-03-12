'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Bell, Pin, Paperclip, CalendarDays, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Communication, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface FormData {
  titolo: string;
  contenuto: string;
  pinned: boolean;
  community_ids: string[];
  expires_at: string;
  file_urls: string; // newline-separated
}

function CommunicationForm({
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
    contenuto: initial?.contenuto ?? '',
    pinned: initial?.pinned ?? false,
    community_ids: initial?.community_ids ?? [],
    expires_at: initial?.expires_at ?? '',
    file_urls: initial?.file_urls ?? '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRich = (k: keyof FormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim() || !form.contenuto.trim()) {
      toast.error('Titolo e contenuto sono obbligatori.', { duration: 5000 });
      return;
    }
    setLoading(true);
    try { await onSave(form); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Errore.', { duration: 5000 }); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Titolo <span className="text-destructive">*</span></label>
        <Input value={form.titolo} onChange={set('titolo')} placeholder="Titolo comunicazione" required />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Contenuto <span className="text-destructive">*</span></label>
        <RichTextEditor value={form.contenuto} onChange={setRich('contenuto')} placeholder="Testo della comunicazione" />
      </div>
      <Textarea value={form.file_urls} onChange={set('file_urls')} placeholder="URL allegati (uno per riga)"
        rows={2} className="resize-none" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Scade il (opzionale)</label>
          <Input type="date" value={form.expires_at} onChange={set('expires_at')} />
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
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <Checkbox
          checked={form.pinned}
          onCheckedChange={(v) => setForm((f) => ({ ...f, pinned: !!v }))}
        />
        Fissa in cima
      </label>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Annulla</Button>
        <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90 text-white">
          {loading ? 'Salvataggio…' : (submitLabel ?? 'Salva')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function parseFileUrls(raw: string): string[] {
  return raw.split('\n').map((u) => u.trim()).filter(Boolean);
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

export default function CommunicationList({
  communications,
  canWrite,
  communities,
}: {
  communications: Communication[];
  canWrite: boolean;
  communities: Community[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const editingItem = editingId ? communications.find((c) => c.id === editingId) : null;

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        contenuto: data.contenuto,
        pinned: data.pinned,
        community_ids: data.community_ids,
        expires_at: data.expires_at || null,
        file_urls: parseFileUrls(data.file_urls),
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Comunicazione pubblicata.');
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/communications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        contenuto: data.contenuto,
        pinned: data.pinned,
        community_ids: data.community_ids,
        expires_at: data.expires_at || null,
        file_urls: parseFileUrls(data.file_urls),
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Comunicazione aggiornata.');
    setEditingId(null);
    router.refresh();
  }

  async function doDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/communications/${deleteTarget}`, { method: 'DELETE' });
    toast.success('Eliminata.');
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova comunicazione</DialogTitle>
          </DialogHeader>
          <CommunicationForm
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
            <DialogTitle>Modifica comunicazione</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <CommunicationForm
              initial={{
                titolo: editingItem.titolo, contenuto: editingItem.contenuto, pinned: editingItem.pinned,
                community_ids: editingItem.community_ids ?? [], expires_at: editingItem.expires_at ?? '',
                file_urls: (editingItem.file_urls ?? []).join('\n'),
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
            <AlertDialogTitle>Elimina comunicazione</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminare questa comunicazione? L&apos;operazione non può essere annullata.
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
            Nuova comunicazione
          </Button>
        </div>
      )}

      {communications.length === 0 && (
        <EmptyState icon={Bell} title="Nessuna comunicazione" description="Non ci sono comunicazioni pubblicate al momento." />
      )}
      {communications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => (
        <div key={c.id} className={`rounded-xl border p-4 space-y-2 ${
          c.pinned ? 'border-brand/30 bg-brand/5' : 'border-border bg-card'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {c.pinned && <Pin className="h-3.5 w-3.5 text-brand flex-shrink-0" />}
              <h3 className="text-sm font-semibold text-foreground">{c.titolo}</h3>
            </div>
            {canWrite && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditingId(c.id)} className="text-xs text-muted-foreground hover:text-foreground transition">Modifica</button>
                <button onClick={() => setDeleteTarget(c.id)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 transition">Elimina</button>
              </div>
            )}
          </div>
          <div className="line-clamp-3 overflow-hidden"><RichTextDisplay html={c.contenuto} /></div>
          {c.file_urls && c.file_urls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {c.file_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-2 py-0.5 text-xs text-foreground transition">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />Allegato {i + 1}
                </a>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDate(c.published_at)}</span>
            {c.expires_at && <span>· Scade: {formatDate(c.expires_at)}</span>}
          </div>
        </div>
      ))}
      <PaginationNav page={page} total={communications.length} onPage={setPage} />
    </div>
  );
}

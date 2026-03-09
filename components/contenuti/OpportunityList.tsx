'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Briefcase, CalendarDays, Paperclip, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Opportunity, OpportunityTipo, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIPO_OPTIONS: { value: OpportunityTipo; label: string }[] = [
  { value: 'LAVORO',     label: 'Lavoro' },
  { value: 'FORMAZIONE', label: 'Formazione' },
  { value: 'STAGE',      label: 'Stage' },
  { value: 'PROGETTO',   label: 'Progetto' },
  { value: 'ALTRO',      label: 'Altro' },
];

const TIPO_COLORS: Record<OpportunityTipo, string> = {
  LAVORO:     'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  FORMAZIONE: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
  STAGE:      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400',
  PROGETTO:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400',
  ALTRO:      'bg-muted border-border text-muted-foreground',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface FormData {
  titolo: string;
  tipo: string;
  descrizione: string;
  requisiti: string;
  scadenza_candidatura: string;
  link_candidatura: string;
  file_url: string;
  community_ids: string[];
}

function OpportunityForm({
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
    tipo: initial?.tipo ?? 'ALTRO',
    descrizione: initial?.descrizione ?? '',
    requisiti: initial?.requisiti ?? '',
    scadenza_candidatura: initial?.scadenza_candidatura ?? '',
    link_candidatura: initial?.link_candidatura ?? '',
    file_url: initial?.file_url ?? '',
    community_ids: initial?.community_ids ?? [],
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRich = (k: keyof FormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim()) { toast.error('Il titolo è obbligatorio.', { duration: 5000 }); return; }
    if (!form.descrizione.trim()) { toast.error('La descrizione è obbligatoria.', { duration: 5000 }); return; }
    setLoading(true);
    try { await onSave(form); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Errore.', { duration: 5000 }); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required className="col-span-2" />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Scadenza candidatura</label>
          <Input type="date" value={form.scadenza_candidatura} onChange={set('scadenza_candidatura')} />
        </div>
      </div>
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione *" />
      <RichTextEditor value={form.requisiti} onChange={setRich('requisiti')} placeholder="Requisiti (opzionale)" />
      <div className="grid grid-cols-2 gap-3">
        <Input value={form.link_candidatura} onChange={set('link_candidatura')} placeholder="Link candidatura (URL)" type="url" />
        <Input value={form.file_url} onChange={set('file_url')} placeholder="URL file allegato" />
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
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground">Pagina {page} di {totalPages}</span>
      <div className="flex gap-2">
        {page > 1
          ? <button onClick={() => onPage(page - 1)} className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-foreground transition" aria-label="Pagina precedente">← Precedente</button>
          : <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40 select-none">← Precedente</span>
        }
        {page < totalPages
          ? <button onClick={() => onPage(page + 1)} className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-foreground transition" aria-label="Pagina successiva">Successivo →</button>
          : <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40 select-none">Successivo →</span>
        }
      </div>
    </div>
  );
}

export default function OpportunityList({
  opportunities,
  canWrite,
  communities,
}: {
  opportunities: Opportunity[];
  canWrite: boolean;
  communities: Community[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const editingItem = editingId ? opportunities.find((o) => o.id === editingId) : null;

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Opportunità pubblicata.');
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Opportunità aggiornata.');
    setEditingId(null);
    router.refresh();
  }

  async function doDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/opportunities/${deleteTarget}`, { method: 'DELETE' });
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
            <DialogTitle>Nuova opportunità</DialogTitle>
          </DialogHeader>
          <OpportunityForm
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
            <DialogTitle>Modifica opportunità</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <OpportunityForm
              initial={{
                titolo: editingItem.titolo, tipo: editingItem.tipo, descrizione: editingItem.descrizione,
                requisiti: editingItem.requisiti ?? '', scadenza_candidatura: editingItem.scadenza_candidatura ?? '',
                link_candidatura: editingItem.link_candidatura ?? '', file_url: editingItem.file_url ?? '',
                community_ids: editingItem.community_ids ?? [],
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
            <AlertDialogTitle>Elimina opportunità</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminare questa opportunità? L&apos;operazione non può essere annullata.
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
            Nuova opportunità
          </Button>
        </div>
      )}

      {opportunities.length === 0 && (
        <EmptyState icon={Briefcase} title="Nessuna opportunità disponibile" description="Non ci sono opportunità pubblicate al momento." />
      )}
      {opportunities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIPO_COLORS[o.tipo as OpportunityTipo] ?? TIPO_COLORS.ALTRO}`}>
                {TIPO_OPTIONS.find((t) => t.value === o.tipo)?.label ?? o.tipo}
              </span>
              <h3 className="text-sm font-semibold text-foreground">{o.titolo}</h3>
            </div>
            {canWrite && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditingId(o.id)} className="text-xs text-muted-foreground hover:text-foreground transition">Modifica</button>
                <button onClick={() => setDeleteTarget(o.id)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 transition">Elimina</button>
              </div>
            )}
          </div>
          <RichTextDisplay html={o.descrizione} className="line-clamp-3" />
          {o.requisiti && <RichTextDisplay html={o.requisiti} className="text-xs" />}
          <div className="flex items-center gap-3 flex-wrap">
            {o.scadenza_candidatura && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" />Scadenza: {formatDate(o.scadenza_candidatura)}</span>
            )}
            {o.link_candidatura && (
              <a href={o.link_candidatura} target="_blank" rel="noopener noreferrer"
                className="text-xs text-link hover:text-link/80 underline transition">
                Candidati →
              </a>
            )}
            {o.file_url && (
              <a href={o.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-2 py-0.5 text-xs text-foreground transition">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />Allegato
              </a>
            )}
          </div>
        </div>
      ))}
      <PaginationNav page={page} total={opportunities.length} onPage={setPage} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Briefcase, CalendarDays, Paperclip, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Opportunity, OpportunityTipo, Community } from '@/lib/types';
import { TipoBadge } from '@/components/ui/content-status-badge';
import { OPP_TIPO_COLORS } from '@/lib/content-badge-maps';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { createOpportunitySchema, type CreateOpportunityFormValues } from '@/lib/schemas/opportunity';
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

const TIPO_OPTIONS: { value: OpportunityTipo; label: string }[] = [
  { value: 'Volontariato', label: 'Volontariato' },
  { value: 'Formazione',   label: 'Formazione' },
  { value: 'Lavoro',       label: 'Lavoro' },
  { value: 'Altro',        label: 'Altro' },
];


function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface FormData {
  titolo: string;
  tipo: string;
  descrizione: string;
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
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateOpportunityFormValues>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: {
      titolo: initial?.titolo ?? '',
      tipo: (initial?.tipo as CreateOpportunityFormValues['tipo']) ?? 'Altro',
      descrizione: initial?.descrizione ?? '',
      scadenza_candidatura: initial?.scadenza_candidatura ?? '',
      link_candidatura: initial?.link_candidatura ?? '',
      file_url: initial?.file_url ?? '',
      community_ids: initial?.community_ids ?? [],
    },
  });

  async function onSubmit(values: CreateOpportunityFormValues) {
    setLoading(true);
    try {
      await onSave({
        titolo: values.titolo,
        tipo: values.tipo ?? 'Altro',
        descrizione: values.descrizione,
        scadenza_candidatura: values.scadenza_candidatura ?? '',
        link_candidatura: values.link_candidatura ?? '',
        file_url: values.file_url ?? '',
        community_ids: values.community_ids ?? [],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore.', { duration: 5000 });
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField control={form.control} name="titolo" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel className="text-xs">Titolo <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input {...field} placeholder="Titolo dell'opportunità" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="tipo" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="scadenza_candidatura" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Scadenza candidatura</FormLabel>
              <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="descrizione" render={() => (
          <FormItem>
            <FormLabel className="text-xs">Descrizione <span className="text-destructive">*</span></FormLabel>
            <Controller
              control={form.control}
              name="descrizione"
              render={({ field: { value, onChange } }) => (
                <RichTextEditor value={value} onChange={onChange} placeholder="Descrizione dell'opportunità" />
              )}
            />
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField control={form.control} name="link_candidatura" render={({ field }) => (
            <FormItem>
              <FormControl><Input {...field} placeholder="Link candidatura (URL)" type="url" /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="file_url" render={({ field }) => (
            <FormItem>
              <FormControl><Input {...field} placeholder="URL file allegato" /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Community (vuoto = tutte)</label>
          <Controller
            control={form.control}
            name="community_ids"
            render={({ field: { value, onChange } }) => (
              <div className="flex flex-wrap gap-3">
                {communities.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                    <Checkbox
                      checked={(value ?? []).includes(c.id)}
                      onCheckedChange={(v) =>
                        onChange(v ? [...(value ?? []), c.id] : (value ?? []).filter((id: string) => id !== c.id))
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>Annulla</Button>
          <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90 text-white">
            {loading ? 'Salvataggio…' : (submitLabel ?? 'Salva')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
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
                scadenza_candidatura: editingItem.scadenza_candidatura ?? '',
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
              <TipoBadge tipo={o.tipo} label={TIPO_OPTIONS.find((t) => t.value === o.tipo)?.label ?? o.tipo} colorMap={OPP_TIPO_COLORS} />
              <h3 className="text-sm font-semibold text-foreground">{o.titolo}</h3>
            </div>
            {canWrite && (
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(o.id)} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">Modifica</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(o.id)} className="h-auto p-0 text-xs text-red-600 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300">Elimina</Button>
              </div>
            )}
          </div>
          <RichTextDisplay html={o.descrizione} className="line-clamp-3" />
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

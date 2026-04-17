'use client';

import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { BookOpen, ExternalLink, Paperclip, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Resource, ResourceCategoria, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { createResourceSchema, type CreateResourceFormValues } from '@/lib/schemas/resource';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORIA_OPTIONS: { value: ResourceCategoria; label: string }[] = [
  { value: 'Guida',     label: 'Guida' },
  { value: 'Allegato',  label: 'Allegato' },
  { value: 'Locandina', label: 'Locandina' },
  { value: 'Bando',     label: 'Bando' },
  { value: 'Decreto',   label: 'Decreto' },
  { value: 'Altro',     label: 'Altro' },
];

interface FormData {
  titolo: string;
  descrizione: string;
  link: string;
  file_url: string;
  tag: string;  // comma-separated
  community_ids: string[];
  categoria: string;
}

function ResourceForm({
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

  const formSchema = createResourceSchema.extend({
    tag_raw: z.string().optional(),
  });
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titolo: initial?.titolo ?? '',
      descrizione: initial?.descrizione ?? '',
      link: initial?.link ?? '',
      file_url: initial?.file_url ?? '',
      tag_raw: initial?.tag ?? '',
      community_ids: initial?.community_ids ?? [],
      categoria: initial?.categoria ?? 'ALTRO',
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await onSave({
        titolo: values.titolo,
        descrizione: values.descrizione ?? '',
        link: values.link ?? '',
        file_url: values.file_url ?? '',
        tag: values.tag_raw ?? '',
        community_ids: values.community_ids ?? [],
        categoria: values.categoria ?? 'ALTRO',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore.', { duration: 5000 });
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField control={form.control} name="titolo" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Titolo <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input {...field} placeholder="Titolo della risorsa" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="descrizione" render={() => (
          <FormItem>
            <Controller
              control={form.control}
              name="descrizione"
              render={({ field: { value, onChange } }) => (
                <RichTextEditor value={value ?? ''} onChange={onChange} placeholder="Descrizione" />
              )}
            />
          </FormItem>
        )} />
        <FormField control={form.control} name="link" render={({ field }) => (
          <FormItem>
            <FormControl><Input {...field} placeholder="Link (URL)" type="url" /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="file_url" render={({ field }) => (
          <FormItem>
            <FormControl><Input {...field} placeholder="URL file alternativo (es. Drive)" /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="categoria" render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormLabel className="text-sm text-muted-foreground shrink-0">Categoria:</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="w-auto"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {CATEGORIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </FormItem>
        )} />
        <FormField control={form.control} name="tag_raw" render={({ field }) => (
          <FormItem>
            <FormControl><Input {...field} placeholder="Tag (separati da virgola, es. contratto, onboarding)" /></FormControl>
          </FormItem>
        )} />
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

function parseTags(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

export default function ResourceList({
  resources,
  canWrite,
  communities,
}: {
  resources: Resource[];
  canWrite: boolean;
  communities: Community[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const editingItem = editingId ? resources.find((r) => r.id === editingId) : null;

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        descrizione: data.descrizione || undefined,
        link: data.link || undefined,
        file_url: data.file_url || undefined,
        tag: parseTags(data.tag),
        community_ids: data.community_ids,
        categoria: data.categoria || 'ALTRO',
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Risorsa pubblicata.');
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        descrizione: data.descrizione || null,
        link: data.link || null,
        file_url: data.file_url || null,
        tag: parseTags(data.tag),
        community_ids: data.community_ids,
        categoria: data.categoria || 'ALTRO',
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    toast.success('Risorsa aggiornata.');
    setEditingId(null);
    router.refresh();
  }

  async function doDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/resources/${deleteTarget}`, { method: 'DELETE' });
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
            <DialogTitle>Nuova risorsa</DialogTitle>
          </DialogHeader>
          <ResourceForm
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
            <DialogTitle>Modifica risorsa</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <ResourceForm
              initial={{ titolo: editingItem.titolo, descrizione: editingItem.descrizione ?? '', link: editingItem.link ?? '', file_url: editingItem.file_url ?? '', tag: (editingItem.tag ?? []).join(', '), community_ids: editingItem.community_ids ?? [], categoria: editingItem.categoria ?? 'ALTRO' }}
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
            <AlertDialogTitle>Elimina risorsa</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminare questa risorsa? L&apos;operazione non può essere annullata.
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
            Nuova risorsa
          </Button>
        </div>
      )}

      {resources.length === 0 && (
        <EmptyState icon={BookOpen} title="Nessuna risorsa disponibile" description="Non ci sono risorse pubblicate al momento." />
      )}
      {resources.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{r.titolo}</h3>
            {canWrite && (
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(r.id)} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">Modifica</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r.id)} className="h-auto p-0 text-xs text-red-600 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300">Elimina</Button>
              </div>
            )}
          </div>
          {r.descrizione && <div className="line-clamp-3 overflow-hidden"><RichTextDisplay html={r.descrizione} /></div>}
          <div className="flex items-center gap-2 flex-wrap">
            {r.link && (
              <a href={r.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1 text-xs text-foreground transition">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />Apri link
              </a>
            )}
            {r.file_url && (
              <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1 text-xs text-foreground transition">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />File
              </a>
            )}
          </div>
          {r.tag && r.tag.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {r.tag.map((t) => (
                <span key={t} className="rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

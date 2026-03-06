'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Resource, ResourceCategoria, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const CATEGORIA_OPTIONS: { value: ResourceCategoria; label: string }[] = [
  { value: 'GUIDA',     label: 'Guida' },
  { value: 'NORMATIVA', label: 'Normativa' },
  { value: 'PROCEDURA', label: 'Procedura' },
  { value: 'MODELLO',   label: 'Modello' },
  { value: 'ALTRO',     label: 'Altro' },
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
}: {
  initial?: Partial<FormData>;
  communities: Community[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormData>({
    titolo: initial?.titolo ?? '',
    descrizione: initial?.descrizione ?? '',
    link: initial?.link ?? '',
    file_url: initial?.file_url ?? '',
    tag: initial?.tag ?? '',
    community_ids: initial?.community_ids ?? [],
    categoria: initial?.categoria ?? 'ALTRO',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRich = (k: keyof FormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim()) { setError('Il titolo è obbligatorio.'); return; }
    setLoading(true); setError(null);
    try { await onSave(form); }
    catch (err) { setError(err instanceof Error ? err.message : 'Errore.'); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <Input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required />
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione" />
      <Input value={form.link} onChange={set('link')} placeholder="Link (URL)" type="url" />
      <Input value={form.file_url} onChange={set('file_url')} placeholder="URL file alternativo (es. Drive)" />
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground shrink-0">Categoria:</label>
        <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
          <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Input value={form.tag} onChange={set('tag')} placeholder="Tag (separati da virgola, es. contratto, onboarding)" />
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
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} size="sm" className="bg-brand hover:bg-blue-500 text-white">
          {loading ? 'Salvataggio…' : 'Salva'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          Annulla
        </Button>
      </div>
    </form>
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
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Eliminare questa risorsa?')) return;
    await fetch(`/api/resources/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canWrite && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="rounded-lg border border-dashed border-border hover:border-blue-600 px-4 py-2 text-sm text-muted-foreground hover:text-blue-400 transition">
          + Nuova risorsa
        </button>
      )}
      {showForm && (
        <ResourceForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {resources.length === 0 && !showForm && (
        <EmptyState icon={BookOpen} title="Nessuna risorsa disponibile" description="Non ci sono risorse pubblicate al momento." />
      )}
      {resources.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          {editingId === r.id ? (
            <ResourceForm
              initial={{ titolo: r.titolo, descrizione: r.descrizione ?? '', link: r.link ?? '', file_url: r.file_url ?? '', tag: (r.tag ?? []).join(', '), community_ids: r.community_ids ?? [], categoria: r.categoria ?? 'ALTRO' }}
              communities={communities}
              onSave={(data) => handleEdit(r.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{r.titolo}</h3>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(r.id)} className="text-xs text-muted-foreground hover:text-foreground transition">Modifica</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              {r.descrizione && <RichTextDisplay html={r.descrizione} />}
              <div className="flex items-center gap-2 flex-wrap">
                {r.link && (
                  <a href={r.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1 text-xs text-foreground transition">
                    🔗 Apri link
                  </a>
                )}
                {r.file_url && (
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1 text-xs text-foreground transition">
                    📎 File
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
            </>
          )}
        </div>
      ))}
    </div>
  );
}

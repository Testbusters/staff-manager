'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Opportunity, OpportunityTipo, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
}: {
  initial?: Partial<FormData>;
  communities: Community[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
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
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRich = (k: keyof FormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim()) { setError('Il titolo è obbligatorio.'); return; }
    if (!form.descrizione.trim()) { setError('La descrizione è obbligatoria.'); return; }
    setLoading(true); setError(null);
    try { await onSave(form); }
    catch (err) { setError(err instanceof Error ? err.message : 'Errore.'); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
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

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
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
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Eliminare questa opportunità?')) return;
    await fetch(`/api/opportunities/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canWrite && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="rounded-lg border border-dashed border-border hover:border-blue-600 px-4 py-2 text-sm text-muted-foreground hover:text-blue-400 transition">
          + Nuova opportunità
        </button>
      )}
      {showForm && (
        <OpportunityForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {opportunities.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-6 text-center">Nessuna opportunità disponibile.</p>
      )}
      {opportunities.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          {editingId === o.id ? (
            <OpportunityForm
              initial={{
                titolo: o.titolo, tipo: o.tipo, descrizione: o.descrizione,
                requisiti: o.requisiti ?? '', scadenza_candidatura: o.scadenza_candidatura ?? '',
                link_candidatura: o.link_candidatura ?? '', file_url: o.file_url ?? '',
                community_ids: o.community_ids ?? [],
              }}
              communities={communities}
              onSave={(data) => handleEdit(o.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
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
                    <button onClick={() => handleDelete(o.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              <RichTextDisplay html={o.descrizione} className="line-clamp-3" />
              {o.requisiti && <RichTextDisplay html={o.requisiti} className="text-xs" />}
              <div className="flex items-center gap-3 flex-wrap">
                {o.scadenza_candidatura && (
                  <span className="text-xs text-muted-foreground">📅 Scadenza: {formatDate(o.scadenza_candidatura)}</span>
                )}
                {o.link_candidatura && (
                  <a href={o.link_candidatura} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline transition">
                    Candidati →
                  </a>
                )}
                {o.file_url && (
                  <a href={o.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-2 py-0.5 text-xs text-foreground transition">
                    📎 Allegato
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

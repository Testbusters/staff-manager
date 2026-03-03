'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Opportunity, OpportunityTipo, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

const TIPO_OPTIONS: { value: OpportunityTipo; label: string }[] = [
  { value: 'LAVORO',     label: 'Lavoro' },
  { value: 'FORMAZIONE', label: 'Formazione' },
  { value: 'STAGE',      label: 'Stage' },
  { value: 'PROGETTO',   label: 'Progetto' },
  { value: 'ALTRO',      label: 'Altro' },
];

const TIPO_COLORS: Record<OpportunityTipo, string> = {
  LAVORO:     'bg-green-900/30 border-green-800 text-green-400',
  FORMAZIONE: 'bg-blue-900/30 border-blue-800 text-blue-400',
  STAGE:      'bg-purple-900/30 border-purple-800 text-purple-400',
  PROGETTO:   'bg-amber-900/30 border-amber-800 text-amber-400',
  ALTRO:      'bg-gray-800 border-gray-700 text-gray-400',
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-800 bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required
          className="col-span-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Tipo</label>
          <select value={form.tipo} onChange={set('tipo')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none">
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Scadenza candidatura</label>
          <input type="date" value={form.scadenza_candidatura} onChange={set('scadenza_candidatura')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione *" />
      <RichTextEditor value={form.requisiti} onChange={setRich('requisiti')} placeholder="Requisiti (opzionale)" />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.link_candidatura} onChange={set('link_candidatura')} placeholder="Link candidatura (URL)" type="url"
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        <input value={form.file_url} onChange={set('file_url')} placeholder="URL file allegato"
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Community (vuoto = tutte)</label>
        <div className="flex flex-wrap gap-3">
          {communities.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox"
                checked={form.community_ids.includes(c.id)}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  community_ids: e.target.checked
                    ? [...f.community_ids, c.id]
                    : f.community_ids.filter((id) => id !== c.id),
                }))}
                className="rounded border-gray-600 bg-gray-800" />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-1.5 text-sm font-medium text-white transition">
          {loading ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-1.5 text-sm text-gray-300 transition">
          Annulla
        </button>
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
          className="rounded-lg border border-dashed border-gray-700 hover:border-blue-600 px-4 py-2 text-sm text-gray-400 hover:text-blue-400 transition">
          + Nuova opportunità
        </button>
      )}
      {showForm && (
        <OpportunityForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {opportunities.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 py-6 text-center">Nessuna opportunità disponibile.</p>
      )}
      {opportunities.map((o) => (
        <div key={o.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
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
                  <h3 className="text-sm font-semibold text-gray-100">{o.titolo}</h3>
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(o.id)} className="text-xs text-gray-500 hover:text-gray-300 transition">Modifica</button>
                    <button onClick={() => handleDelete(o.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              <RichTextDisplay html={o.descrizione} className="line-clamp-3" />
              {o.requisiti && <RichTextDisplay html={o.requisiti} className="text-xs" />}
              <div className="flex items-center gap-3 flex-wrap">
                {o.scadenza_candidatura && (
                  <span className="text-xs text-gray-500">📅 Scadenza: {formatDate(o.scadenza_candidatura)}</span>
                )}
                {o.link_candidatura && (
                  <a href={o.link_candidatura} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline transition">
                    Candidati →
                  </a>
                )}
                {o.file_url && (
                  <a href={o.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 text-xs text-gray-300 transition">
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

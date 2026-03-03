'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Discount, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryBadge(valid_to: string | null) {
  if (!valid_to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(valid_to);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">Scaduto</span>;
  if (diffDays <= 7) return <span className="rounded-full bg-yellow-900/40 border border-yellow-700 px-2 py-0.5 text-xs text-yellow-300">In scadenza</span>;
  return <span className="rounded-full bg-green-900/30 border border-green-800 px-2 py-0.5 text-xs text-green-400">Attivo</span>;
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
}: {
  initial?: Partial<FormData>;
  communities: Community[];
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-800 bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">{error}</p>}
      <input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
      <input value={form.fornitore} onChange={set('fornitore')} placeholder="Fornitore (es. Amazon, MediaWorld)"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione" />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.codice_sconto} onChange={set('codice_sconto')} placeholder="Codice sconto"
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        <input value={form.link} onChange={set('link')} placeholder="Link (URL)" type="url"
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        <input value={form.logo_url} onChange={set('logo_url')} placeholder="URL logo fornitore"
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        <input value={form.file_url} onChange={set('file_url')} placeholder="URL file allegato"
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Valido dal</label>
          <input type="date" value={form.valid_from} onChange={set('valid_from')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Valido fino al</label>
          <input type="date" value={form.valid_to} onChange={set('valid_to')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none" />
        </div>
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

export default function DiscountList({
  discounts,
  canWrite,
  communities,
}: {
  discounts: Discount[];
  canWrite: boolean;
  communities: Community[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/discounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, community_ids: data.community_ids }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Eliminare questo sconto?')) return;
    await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canWrite && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="rounded-lg border border-dashed border-gray-700 hover:border-blue-600 px-4 py-2 text-sm text-gray-400 hover:text-blue-400 transition">
          + Nuovo sconto
        </button>
      )}
      {showForm && (
        <DiscountForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {discounts.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 py-6 text-center">Nessuno sconto disponibile.</p>
      )}
      {discounts.map((d) => (
        <div key={d.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
          {editingId === d.id ? (
            <DiscountForm
              initial={{
                titolo: d.titolo, descrizione: d.descrizione ?? '', codice_sconto: d.codice_sconto ?? '',
                link: d.link ?? '', valid_from: d.valid_from ?? '', valid_to: d.valid_to ?? '',
                community_ids: d.community_ids ?? [], fornitore: d.fornitore ?? '',
                logo_url: d.logo_url ?? '', file_url: d.file_url ?? '',
              }}
              communities={communities}
              onSave={(data) => handleEdit(d.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-100">{d.titolo}</h3>
                  {d.fornitore && <span className="text-xs text-gray-500">· {d.fornitore}</span>}
                  {expiryBadge(d.valid_to)}
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(d.id)} className="text-xs text-gray-500 hover:text-gray-300 transition">Modifica</button>
                    <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              {d.descrizione && <RichTextDisplay html={d.descrizione} />}
              <div className="flex items-center gap-3 flex-wrap">
                {d.codice_sconto && (
                  <span className="rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs font-mono text-yellow-300">
                    {d.codice_sconto}
                  </span>
                )}
                {d.link && (
                  <a href={d.link} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline transition">
                    Scopri →
                  </a>
                )}
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 text-xs text-gray-300 transition">
                    📎 Allegato
                  </a>
                )}
                {(d.valid_from || d.valid_to) && (
                  <span className="text-xs text-gray-600">
                    {d.valid_from && `Dal ${formatDate(d.valid_from)}`}
                    {d.valid_from && d.valid_to && ' · '}
                    {d.valid_to && `Al ${formatDate(d.valid_to)}`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

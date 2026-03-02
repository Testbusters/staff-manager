'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Communication, Community } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface FormData {
  titolo: string;
  contenuto: string;
  pinned: boolean;
  community_id: string;
  expires_at: string;
  file_urls: string; // newline-separated
}

function CommunicationForm({
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
    contenuto: initial?.contenuto ?? '',
    pinned: initial?.pinned ?? false,
    community_id: initial?.community_id ?? '',
    expires_at: initial?.expires_at ?? '',
    file_urls: initial?.file_urls ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titolo.trim() || !form.contenuto.trim()) {
      setError('Titolo e contenuto sono obbligatori.');
      return;
    }
    setLoading(true);
    setError(null);
    try { await onSave(form); }
    catch (err) { setError(err instanceof Error ? err.message : 'Errore.'); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-800 bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">{error}</p>}
      <input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
      <textarea value={form.contenuto} onChange={set('contenuto')} placeholder="Contenuto *" rows={4} required
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none" />
      <textarea value={form.file_urls} onChange={set('file_urls')} placeholder="URL allegati (uno per riga)"
        rows={2}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Scade il (opzionale)</label>
          <input type="date" value={form.expires_at} onChange={set('expires_at')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Community</label>
          <select value={form.community_id} onChange={set('community_id')}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none">
            <option value="">Tutte</option>
            {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input type="checkbox" checked={form.pinned}
          onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
          className="rounded border-gray-600 bg-gray-800" />
        Fissa in cima
      </label>
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

function parseFileUrls(raw: string): string[] {
  return raw.split('\n').map((u) => u.trim()).filter(Boolean);
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

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        contenuto: data.contenuto,
        pinned: data.pinned,
        community_id: data.community_id || null,
        expires_at: data.expires_at || null,
        file_urls: parseFileUrls(data.file_urls),
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
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
        community_id: data.community_id || null,
        expires_at: data.expires_at || null,
        file_urls: parseFileUrls(data.file_urls),
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Eliminare questa comunicazione?')) return;
    await fetch(`/api/communications/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canWrite && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="rounded-lg border border-dashed border-gray-700 hover:border-blue-600 px-4 py-2 text-sm text-gray-400 hover:text-blue-400 transition">
          + Nuova comunicazione
        </button>
      )}
      {showForm && (
        <CommunicationForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {communications.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 py-6 text-center">Nessuna comunicazione pubblicata.</p>
      )}
      {communications.map((c) => (
        <div key={c.id} className={`rounded-xl border p-4 space-y-2 ${
          c.pinned ? 'border-blue-700 bg-blue-950/20' : 'border-gray-800 bg-gray-900'
        }`}>
          {editingId === c.id ? (
            <CommunicationForm
              initial={{
                titolo: c.titolo, contenuto: c.contenuto, pinned: c.pinned,
                community_id: c.community_id ?? '', expires_at: c.expires_at ?? '',
                file_urls: (c.file_urls ?? []).join('\n'),
              }}
              communities={communities}
              onSave={(data) => handleEdit(c.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {c.pinned && <span className="text-blue-400 text-sm">📌</span>}
                  <h3 className="text-sm font-semibold text-gray-100">{c.titolo}</h3>
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(c.id)} className="text-xs text-gray-500 hover:text-gray-300 transition">Modifica</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.contenuto}</p>
              {c.file_urls && c.file_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {c.file_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 text-xs text-gray-300 transition">
                      📎 Allegato {i + 1}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>{formatDate(c.published_at)}</span>
                {c.expires_at && <span>· Scade: {formatDate(c.expires_at)}</span>}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

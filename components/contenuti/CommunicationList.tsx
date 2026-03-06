'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Communication, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

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
    community_ids: initial?.community_ids ?? [],
    expires_at: initial?.expires_at ?? '',
    file_urls: initial?.file_urls ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRich = (k: keyof FormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <Input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required />
      <RichTextEditor value={form.contenuto} onChange={setRich('contenuto')} placeholder="Contenuto *" />
      <Textarea value={form.file_urls} onChange={set('file_urls')} placeholder="URL allegati (uno per riga)"
        rows={2} className="resize-none" />
      <div className="grid grid-cols-2 gap-3">
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
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="rounded-lg bg-brand hover:bg-brand/90 disabled:opacity-50 px-4 py-1.5 text-sm font-medium text-white transition">
          {loading ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-border bg-muted hover:bg-accent px-4 py-1.5 text-sm text-foreground transition">
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
        community_ids: data.community_ids,
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
        community_ids: data.community_ids,
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
          className="rounded-lg border border-dashed border-border hover:border-blue-600 px-4 py-2 text-sm text-muted-foreground hover:text-blue-400 transition">
          + Nuova comunicazione
        </button>
      )}
      {showForm && (
        <CommunicationForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {communications.length === 0 && !showForm && (
        <EmptyState icon={Bell} title="Nessuna comunicazione" description="Non ci sono comunicazioni pubblicate al momento." />
      )}
      {communications.map((c) => (
        <div key={c.id} className={`rounded-xl border p-4 space-y-2 ${
          c.pinned ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20' : 'border-border bg-card'
        }`}>
          {editingId === c.id ? (
            <CommunicationForm
              initial={{
                titolo: c.titolo, contenuto: c.contenuto, pinned: c.pinned,
                community_ids: c.community_ids ?? [], expires_at: c.expires_at ?? '',
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
                  <h3 className="text-sm font-semibold text-foreground">{c.titolo}</h3>
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(c.id)} className="text-xs text-muted-foreground hover:text-foreground transition">Modifica</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              <RichTextDisplay html={c.contenuto} />
              {c.file_urls && c.file_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {c.file_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted hover:bg-accent px-2 py-0.5 text-xs text-foreground transition">
                      📎 Allegato {i + 1}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
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

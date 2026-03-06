'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentEvent, EventTipo, Community } from '@/lib/types';
import RichTextEditor from '@/components/ui/RichTextEditor';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const TIPO_OPTIONS: { value: EventTipo; label: string }[] = [
  { value: 'WEBINAR',   label: 'Webinar' },
  { value: 'INCONTRO',  label: 'Incontro' },
  { value: 'WORKSHOP',  label: 'Workshop' },
  { value: 'SOCIAL',    label: 'Social' },
  { value: 'ALTRO',     label: 'Altro' },
];

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}

// datetime-local inputs require 'YYYY-MM-DDTHH:mm' format
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

interface FormData {
  titolo: string;
  descrizione: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  luma_url: string;
  luma_embed_url: string;
  community_ids: string[];
  tipo: string;
  file_url: string;
}

function EventForm({
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
    start_datetime: initial?.start_datetime ?? '',
    end_datetime: initial?.end_datetime ?? '',
    location: initial?.location ?? '',
    luma_url: initial?.luma_url ?? '',
    luma_embed_url: initial?.luma_embed_url ?? '',
    community_ids: initial?.community_ids ?? [],
    tipo: initial?.tipo ?? '',
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <Input value={form.titolo} onChange={set('titolo')} placeholder="Titolo *" required />
      <RichTextEditor value={form.descrizione} onChange={setRich('descrizione')} placeholder="Descrizione" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data/ora inizio</label>
          <Input type="datetime-local" value={form.start_datetime} onChange={set('start_datetime')} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data/ora fine</label>
          <Input type="datetime-local" value={form.end_datetime} onChange={set('end_datetime')} />
        </div>
      </div>
      <Input value={form.location} onChange={set('location')} placeholder="Luogo (es. Online, Milano)" />
      <Input value={form.luma_url} onChange={set('luma_url')} placeholder="URL pagina Luma" type="url" />
      <Input value={form.luma_embed_url} onChange={set('luma_embed_url')} placeholder="URL embed Luma (per iframe)" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tipo evento</label>
          <Select value={form.tipo || undefined} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue placeholder="— Nessun tipo —" /></SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input value={form.file_url} onChange={set('file_url')} placeholder="URL file allegato" className="self-end" />
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

export default function EventList({
  events,
  canWrite,
  communities,
}: {
  events: ContentEvent[];
  canWrite: boolean;
  communities: Community[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(data: FormData) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        descrizione: data.descrizione || undefined,
        start_datetime: data.start_datetime || null,
        end_datetime: data.end_datetime || null,
        location: data.location || null,
        luma_url: data.luma_url || null,
        luma_embed_url: data.luma_embed_url || null,
        community_ids: data.community_ids,
        tipo: data.tipo || null,
        file_url: data.file_url || null,
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    setShowForm(false);
    router.refresh();
  }

  async function handleEdit(id: string, data: FormData) {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: data.titolo,
        descrizione: data.descrizione || null,
        start_datetime: data.start_datetime || null,
        end_datetime: data.end_datetime || null,
        location: data.location || null,
        luma_url: data.luma_url || null,
        luma_embed_url: data.luma_embed_url || null,
        community_ids: data.community_ids,
        tipo: data.tipo || null,
        file_url: data.file_url || null,
      }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Errore.'); }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Eliminare questo evento?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canWrite && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="rounded-lg border border-dashed border-border hover:border-blue-600 px-4 py-2 text-sm text-muted-foreground hover:text-blue-400 transition">
          + Nuovo evento
        </button>
      )}
      {showForm && (
        <EventForm communities={communities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {events.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-6 text-center">Nessun evento in programma.</p>
      )}
      {events.map((ev) => (
        <div key={ev.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
          {editingId === ev.id ? (
            <EventForm
              initial={{
                titolo: ev.titolo,
                descrizione: ev.descrizione ?? '',
                start_datetime: toDatetimeLocal(ev.start_datetime),
                end_datetime: toDatetimeLocal(ev.end_datetime),
                location: ev.location ?? '',
                luma_url: ev.luma_url ?? '',
                luma_embed_url: ev.luma_embed_url ?? '',
                community_ids: ev.community_ids ?? [],
                tipo: ev.tipo ?? '',
                file_url: ev.file_url ?? '',
              }}
              communities={communities}
              onSave={(data) => handleEdit(ev.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{ev.titolo}</h3>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingId(ev.id)} className="text-xs text-muted-foreground hover:text-foreground transition">Modifica</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-600 hover:text-red-400 transition">Elimina</button>
                  </div>
                )}
              </div>
              {ev.descrizione && <RichTextDisplay html={ev.descrizione} />}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {(ev.start_datetime || ev.end_datetime) && (
                  <span>📅 {formatDateRange(ev.start_datetime, ev.end_datetime)}</span>
                )}
                {ev.location && <span>📍 {ev.location}</span>}
                {ev.luma_url && (
                  <a href={ev.luma_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline transition">
                    Pagina evento →
                  </a>
                )}
              </div>
              {ev.luma_embed_url && (
                <div className="rounded-xl overflow-hidden border border-border mt-1">
                  <iframe
                    src={ev.luma_embed_url}
                    className="w-full h-64 border-0"
                    title={ev.titolo}
                    loading="lazy"
                    allow="fullscreen"
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

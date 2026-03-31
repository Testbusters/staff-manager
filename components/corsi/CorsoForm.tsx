'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Corso, CorsoStato } from '@/lib/types';

interface Props {
  mode: 'create' | 'edit';
  initialData?: Corso & { stato: CorsoStato };
  communities: { id: string; name: string }[];
  cittaList: string[];
  materieList: string[];
}

interface FormData {
  nome: string;
  codice_identificativo: string;
  community_id: string;
  modalita: 'online' | 'in_aula';
  citta: string;
  linea: string;
  responsabile_doc: string;
  licenza_zoom: string;
  data_inizio: string;
  data_fine: string;
  max_docenti_per_lezione: string;
  max_qa_per_lezione: string;
  link_lw: string;
  link_zoom: string;
  link_telegram_corsisti: string;
  link_qa_assignments: string;
  link_questionari: string;
  link_emergenza: string;
}

export default function CorsoForm({ mode, initialData, communities, cittaList }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    nome: initialData?.nome ?? '',
    codice_identificativo: initialData?.codice_identificativo ?? '',
    community_id: initialData?.community_id ?? (communities[0]?.id ?? ''),
    modalita: initialData?.modalita ?? 'online',
    citta: initialData?.citta ?? '',
    linea: initialData?.linea ?? '',
    responsabile_doc: initialData?.responsabile_doc ?? '',
    licenza_zoom: initialData?.licenza_zoom ?? '',
    data_inizio: initialData?.data_inizio ?? '',
    data_fine: initialData?.data_fine ?? '',
    max_docenti_per_lezione: String(initialData?.max_docenti_per_lezione ?? 8),
    max_qa_per_lezione: String(initialData?.max_qa_per_lezione ?? 6),
    link_lw: initialData?.link_lw ?? '',
    link_zoom: initialData?.link_zoom ?? '',
    link_telegram_corsisti: initialData?.link_telegram_corsisti ?? '',
    link_qa_assignments: initialData?.link_qa_assignments ?? '',
    link_questionari: initialData?.link_questionari ?? '',
    link_emergenza: initialData?.link_emergenza ?? '',
  });

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      citta: form.citta || null,
      linea: form.linea || null,
      responsabile_doc: form.responsabile_doc || null,
      licenza_zoom: form.licenza_zoom || null,
      link_lw: form.link_lw || null,
      link_zoom: form.link_zoom || null,
      link_telegram_corsisti: form.link_telegram_corsisti || null,
      link_qa_assignments: form.link_qa_assignments || null,
      link_questionari: form.link_questionari || null,
      link_emergenza: form.link_emergenza || null,
      max_docenti_per_lezione: parseInt(form.max_docenti_per_lezione, 10),
      max_qa_per_lezione: parseInt(form.max_qa_per_lezione, 10),
    };

    const url = mode === 'create' ? '/api/corsi' : `/api/corsi/${initialData!.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Errore durante il salvataggio');
        return;
      }
      if (mode === 'create') {
        router.push(`/corsi/${json.corso.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  const fieldCls = 'space-y-1.5';
  const labelCls = 'block text-sm font-medium text-foreground';

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card border border-border p-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className={fieldCls}>
          <label className={labelCls}>Nome *</label>
          <Input value={form.nome} onChange={set('nome')} required placeholder="Corso Medicina 2026" />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Codice identificativo *</label>
          <Input value={form.codice_identificativo} onChange={set('codice_identificativo')} required placeholder="MED-2026-01" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={fieldCls}>
          <label className={labelCls}>Community *</label>
          <Select
            value={form.community_id}
            onValueChange={(v) => setForm((f) => ({ ...f, community_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona community" />
            </SelectTrigger>
            <SelectContent>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Modalità *</label>
          <Select
            value={form.modalita}
            onValueChange={(v) => setForm((f) => ({ ...f, modalita: v as 'online' | 'in_aula' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="in_aula">In aula</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={fieldCls}>
          <label className={labelCls}>Città</label>
          <Select
            value={form.citta || '__candidatura__'}
            onValueChange={(v) => setForm((f) => ({ ...f, citta: v === '__candidatura__' ? '' : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Aperta a candidatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__candidatura__">Aperta a candidatura città</SelectItem>
              {cittaList.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Linea</label>
          <Input value={form.linea} onChange={set('linea')} placeholder="Linea A" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={fieldCls}>
          <label className={labelCls}>Data inizio *</label>
          <Input type="date" value={form.data_inizio} onChange={set('data_inizio')} required />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Data fine *</label>
          <Input type="date" value={form.data_fine} onChange={set('data_fine')} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={fieldCls}>
          <label className={labelCls}>Max docenti per lezione</label>
          <Input type="number" min={1} value={form.max_docenti_per_lezione} onChange={set('max_docenti_per_lezione')} />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Max Q&A per lezione</label>
          <Input type="number" min={0} value={form.max_qa_per_lezione} onChange={set('max_qa_per_lezione')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={fieldCls}>
          <label className={labelCls}>Responsabile DOC</label>
          <Input value={form.responsabile_doc} onChange={set('responsabile_doc')} placeholder="Nome responsabile" />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Licenza Zoom</label>
          <Input value={form.licenza_zoom} onChange={set('licenza_zoom')} placeholder="licenza@email.com" />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Link utili</p>
        <div className="grid grid-cols-2 gap-4">
          <div className={fieldCls}>
            <label className={labelCls}>Link LW</label>
            <Input value={form.link_lw} onChange={set('link_lw')} placeholder="https://..." />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Link Zoom</label>
            <Input value={form.link_zoom} onChange={set('link_zoom')} placeholder="https://..." />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Telegram corsisti</label>
            <Input value={form.link_telegram_corsisti} onChange={set('link_telegram_corsisti')} placeholder="https://t.me/..." />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Q&A assignments</label>
            <Input value={form.link_qa_assignments} onChange={set('link_qa_assignments')} placeholder="https://..." />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Questionari</label>
            <Input value={form.link_questionari} onChange={set('link_questionari')} placeholder="https://..." />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Emergenza</label>
            <Input value={form.link_emergenza} onChange={set('link_emergenza')} placeholder="https://..." />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          {saving ? 'Salvataggio…' : mode === 'create' ? 'Crea corso' : 'Salva modifiche'}
        </Button>
        {mode === 'create' && (
          <Button type="button" variant="outline" onClick={() => router.push('/corsi')}>
            Annulla
          </Button>
        )}
      </div>
    </form>
  );
}

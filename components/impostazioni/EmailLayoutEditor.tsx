'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EmailLayoutConfig } from '@/lib/email-preview-utils';

interface Props {
  initialLayout: EmailLayoutConfig;
  onSaved: (updated: EmailLayoutConfig) => void;
}

export default function EmailLayoutEditor({ initialLayout, onSaved }: Props) {
  const [form, setForm] = useState<EmailLayoutConfig>(initialLayout);
  const [saving, setSaving] = useState(false);

  function set(key: keyof EmailLayoutConfig, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/email-layout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_color: form.brand_color,
          logo_url: form.logo_url,
          header_title: form.header_title,
          footer_address: form.footer_address,
          footer_legal: form.footer_legal,
        }),
      });
      if (!res.ok) throw new Error('Errore durante il salvataggio');
      const { layout } = await res.json();
      setForm(layout);
      onSaved(layout);
      toast.success('Layout aggiornato');
    } catch {
      toast.error('Errore durante il salvataggio del layout');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Header fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Header</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Colore brand</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <Input
                value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="font-mono text-xs"
                placeholder="#E8320A"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
            <Input
              value={form.logo_url}
              onChange={(e) => set('logo_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Titolo header</label>
            <Input
              value={form.header_title}
              onChange={(e) => set('header_title', e.target.value)}
              placeholder="Staff Manager"
            />
          </div>
        </div>

        {/* Footer fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Footer</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Indirizzo sede legale</label>
            <Input
              value={form.footer_address}
              onChange={(e) => set('footer_address', e.target.value)}
              placeholder="Via ..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nota legale</label>
            <Input
              value={form.footer_legal}
              onChange={(e) => set('footer_legal', e.target.value)}
              placeholder="Testbusters S.r.l. ..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          {saving ? 'Salvataggio...' : 'Salva layout'}
        </Button>
      </div>
    </div>
  );
}

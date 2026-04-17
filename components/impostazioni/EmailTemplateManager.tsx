'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import RichTextEditor from '@/components/ui/RichTextEditor';
import EmailLayoutEditor from './EmailLayoutEditor';
import type { EmailTemplateRow, EmailLayoutConfig } from '@/lib/email-preview-utils';
import { buildPreviewHtml } from '@/lib/email-preview-utils';

// ── Sample data for preview ───────────────────────────────────────────────────

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  E1: { nome: 'Mario Rossi', tipo: 'Compenso', importo: '€ 500,00', data: '01/03/2026', nota: 'Manca fattura' },
  E2: { nome: 'Mario Rossi', tipo: 'Compenso', importo: '€ 500,00', data: '01/03/2026' },
  E3: { nome: 'Mario Rossi', tipo: 'Compenso', importo: '€ 500,00', data: '01/03/2026' },
  E4: { nome: 'Mario Rossi', tipo: 'Compenso', importo: '€ 500,00', data: '01/03/2026' },
  E5: { nome: 'Mario Rossi', titoloDocumento: 'Contratto 2026', data: '01/03/2026' },
  E6: { nomeResponsabile: 'Luisa Bianchi', nomeCollaboratore: 'Mario Rossi', tipo: 'Rimborso', importo: '€ 45,00', community: 'Testbusters', data: '01/03/2026' },
  E7: { nomeResponsabile: 'Luisa Bianchi', nomeCollaboratore: 'Mario Rossi', oggetto: 'Problema accesso', categoria: 'Tecnico', data: '01/03/2026' },
  E8: { email: 'mario@example.com', password: 'TempPass123', ruolo: 'Collaboratore' },
  E9: { nome: 'Mario Rossi', oggetto: 'Problema accesso', data: '01/03/2026' },
  E10: { nome: 'Mario Rossi', titolo: 'Aggiornamento policy', data: '01/03/2026' },
  E11: { nome: 'Mario Rossi', titolo: 'Webinar formazione', data: '01/03/2026' },
  E12: { nome: 'Mario Rossi', tipo: 'Opportunità', titolo: 'Corso di inglese', data: '01/03/2026', genere: 'a' },
};

const GROUP_LABELS: Record<string, string> = {
  compensi_rimborsi: 'Compensi e rimborsi',
  documenti: 'Documenti',
  ticket: 'Ticket',
  invito: 'Invito',
  contenuti: 'Contenuti',
};

const GROUP_ORDER = ['compensi_rimborsi', 'documenti', 'ticket', 'invito', 'contenuti'];

// ── Types ─────────────────────────────────────────────────────────────────────

type Selection = { type: 'template'; key: string } | { type: 'layout' };

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  initialTemplates: EmailTemplateRow[];
  initialLayout: EmailLayoutConfig;
}

export default function EmailTemplateManager({ initialTemplates, initialLayout }: Props) {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>(initialTemplates);
  const [layout, setLayout] = useState<EmailLayoutConfig>(initialLayout);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Group templates
  const grouped = GROUP_ORDER.reduce<Record<string, EmailTemplateRow[]>>((acc, group) => {
    acc[group] = templates.filter((t) => t.event_group === group);
    return acc;
  }, {});

  function selectTemplate(key: string) {
    const tmpl = templates.find((t) => t.key === key);
    if (!tmpl) return;
    setSelection({ type: 'template', key });
    setEditingTemplate({ ...tmpl });
    // Build initial preview
    const sample = SAMPLE_DATA[key] ?? {};
    setPreviewHtml(buildPreviewHtml(tmpl, layout, sample));
  }

  function selectLayout() {
    setSelection({ type: 'layout' });
    setEditingTemplate(null);
    setPreviewHtml(null);
  }

  function setField<K extends keyof EmailTemplateRow>(key: K, value: EmailTemplateRow[K]) {
    setEditingTemplate((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function setHighlightRow(index: number, field: 'label' | 'value', value: string) {
    if (!editingTemplate) return;
    const rows = [...(editingTemplate.highlight_rows ?? [])];
    rows[index] = { ...rows[index], [field]: value };
    setField('highlight_rows', rows);
  }

  function addHighlightRow() {
    if (!editingTemplate) return;
    setField('highlight_rows', [...(editingTemplate.highlight_rows ?? []), { label: '', value: '' }]);
  }

  function removeHighlightRow(index: number) {
    if (!editingTemplate) return;
    const rows = (editingTemplate.highlight_rows ?? []).filter((_, i) => i !== index);
    setField('highlight_rows', rows);
  }

  async function handleSave() {
    if (!editingTemplate || selection?.type !== 'template') return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${editingTemplate.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editingTemplate.subject,
          body_before: editingTemplate.body_before,
          highlight_rows: editingTemplate.highlight_rows,
          body_after: editingTemplate.body_after,
          cta_label: editingTemplate.cta_label,
        }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      const { template: updated } = await res.json();
      setTemplates((prev) => prev.map((t) => t.key === updated.key ? updated : t));
      setEditingTemplate(updated);
      // Regenerate preview
      const sample = SAMPLE_DATA[updated.key] ?? {};
      setPreviewHtml(buildPreviewHtml(updated, layout, sample));
      toast.success('Template salvato');
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!editingTemplate) return;
    try {
      const res = await fetch(`/api/admin/email-templates/${editingTemplate.key}`);
      if (!res.ok) throw new Error();
      const { template } = await res.json();
      setEditingTemplate(template);
      const sample = SAMPLE_DATA[template.key] ?? {};
      setPreviewHtml(buildPreviewHtml(template, layout, sample));
      toast.success('Valori ripristinati dal database');
    } catch {
      toast.error('Errore durante il ripristino');
    }
  }

  const handleLayoutSaved = useCallback((updated: EmailLayoutConfig) => {
    setLayout(updated);
    // Refresh preview if a template is selected
    if (selection?.type === 'template' && editingTemplate) {
      const sample = SAMPLE_DATA[editingTemplate.key] ?? {};
      setPreviewHtml(buildPreviewHtml(editingTemplate, updated, sample));
    }
  }, [selection, editingTemplate]);

  const isTemplate = selection?.type === 'template';
  const isLayoutSel = selection?.type === 'layout';
  const currentKey = isTemplate ? (selection as { type: 'template'; key: string }).key : null;

  return (
    <div className="flex gap-0 min-h-[600px]">

      {/* ── Navigator ──────────────────────────────────────────── */}
      <div className="w-[220px] shrink-0 border-r border-border overflow-y-auto">
        {/* Header/Footer entry */}
        <div
          role="button"
          tabIndex={0}
          onClick={selectLayout}
          onKeyDown={(e) => e.key === 'Enter' && selectLayout()}
          className={`flex items-center gap-2 px-4 py-3 cursor-pointer text-sm border-b border-border transition ${
            isLayoutSel
              ? 'bg-brand text-white'
              : 'text-foreground hover:bg-muted/60'
          }`}
        >
          <Settings size={14} className="shrink-0" />
          <span className="font-medium">Header / Footer</span>
        </div>

        {/* Template groups */}
        {GROUP_ORDER.map((group) => {
          const items = grouped[group] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                {GROUP_LABELS[group]}
              </div>
              {items.map((tmpl) => (
                <div
                  key={tmpl.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectTemplate(tmpl.key)}
                  onKeyDown={(e) => e.key === 'Enter' && selectTemplate(tmpl.key)}
                  className={`flex items-start gap-2 px-4 py-2.5 cursor-pointer transition ${
                    currentKey === tmpl.key
                      ? 'bg-brand text-white'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className={`text-xs font-mono shrink-0 mt-0.5 ${currentKey === tmpl.key ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {tmpl.key}
                  </span>
                  <span className="text-sm leading-snug">{tmpl.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Editor ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selection && (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={Settings}
              title="Seleziona un template"
              description="Scegli un template dalla lista a sinistra per modificarne il contenuto."
            />
          </div>
        )}

        {isLayoutSel && (
          <div className="p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Header e Footer comune</h2>
            <EmailLayoutEditor initialLayout={layout} onSaved={handleLayoutSaved} />
          </div>
        )}

        {isTemplate && editingTemplate && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-muted-foreground">{editingTemplate.key}</span>
                <h2 className="text-sm font-semibold text-foreground">{editingTemplate.label}</h2>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestore}
                  disabled={saving}
                >
                  Ripristina
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  {saving ? 'Salvataggio...' : 'Salva'}
                </Button>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Oggetto email</label>
              <Input
                value={editingTemplate.subject}
                onChange={(e) => setField('subject', e.target.value)}
                placeholder="Oggetto..."
              />
            </div>

            {/* Body before */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Testo prima del riquadro</label>
              <RichTextEditor
                value={editingTemplate.body_before}
                onChange={(html) => setField('body_before', html)}
                placeholder="Testo introduttivo..."
              />
            </div>

            {/* Highlight rows */}
            {editingTemplate.has_highlight && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Righe riquadro dati</label>
                <div className="space-y-2">
                  {(editingTemplate.highlight_rows ?? []).map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.label}
                        onChange={(e) => setHighlightRow(i, 'label', e.target.value)}
                        placeholder="Etichetta"
                        className="w-36 text-sm"
                      />
                      <Input
                        value={row.value}
                        onChange={(e) => setHighlightRow(i, 'value', e.target.value)}
                        placeholder="Valore / {{marker}}"
                        className="flex-1 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHighlightRow(i)}
                        aria-label="Rimuovi riga"
                        className="shrink-0"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addHighlightRow}
                  className="text-xs"
                >
                  <Plus size={12} className="mr-1" />
                  Aggiungi riga
                </Button>
              </div>
            )}

            {/* Body after */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Testo dopo il riquadro</label>
              <RichTextEditor
                value={editingTemplate.body_after}
                onChange={(html) => setField('body_after', html)}
                placeholder="Testo conclusivo..."
              />
            </div>

            {/* CTA label */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Testo pulsante CTA</label>
              <Input
                value={editingTemplate.cta_label}
                onChange={(e) => setField('cta_label', e.target.value)}
                placeholder="Vai all'app"
              />
            </div>

            {/* Available markers */}
            {editingTemplate.available_markers.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Marker disponibili</label>
                <div className="flex flex-wrap gap-1.5">
                  {editingTemplate.available_markers.map((marker) => (
                    <button
                      key={marker}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${marker}}}`).catch(() => {});
                        toast.success(`{{${marker}}} copiato`);
                      }}
                      title="Clicca per copiare"
                      className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground hover:bg-muted/80 transition cursor-pointer"
                    >
                      <code>{`{{${marker}}}`}</code>
                      <Copy size={10} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Preview ────────────────────────────────────────────── */}
      {isTemplate && previewHtml && (
        <div className="w-[360px] shrink-0 border-l border-border flex flex-col">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Anteprima</span>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              className="w-full h-full min-h-[500px] rounded border border-border bg-white"
              title="Anteprima email"
            />
          </div>
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Anteprima aggiornata al salvataggio</p>
          </div>
        </div>
      )}
    </div>
  );
}

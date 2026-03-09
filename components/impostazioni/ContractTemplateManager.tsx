'use client';

import { useState } from 'react';
import { CONTRACT_TEMPLATE_LABELS, type ContractTemplateType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Template = {
  id: string;
  tipo: ContractTemplateType;
  file_name: string;
  uploaded_at: string;
};

type Props = { templates: Template[] };

const CONTRATTO_MARKERS = [
  { key: '{nome}',                desc: 'Nome collaboratore' },
  { key: '{cognome}',             desc: 'Cognome collaboratore' },
  { key: '{codice_fiscale}',      desc: 'Codice fiscale' },
  { key: '{data_nascita}',        desc: 'Data di nascita' },
  { key: '{citta_nascita}',       desc: 'Città di nascita (luogo_nascita)' },
  { key: '{città_residenza}',     desc: 'Città di residenza (comune)' },
  { key: '{indirizzo_residenza}', desc: 'Via / Piazza' },
  { key: '{civico_residenza}',    desc: 'Numero civico' },
  { key: '{data_fine_contratto}', desc: 'Data fine contratto' },
  { key: '{data_corrente}',       desc: 'Data di oggi (DD/MM/AAAA)' },
  { key: '{firma}',               desc: 'Firma collaboratore (PNG)' },
];

const RICEVUTA_MARKERS = [
  { key: '{nome}',                                desc: 'Nome collaboratore' },
  { key: '{cognome}',                             desc: 'Cognome collaboratore' },
  { key: '{codice_fiscale}',                      desc: 'Codice fiscale' },
  { key: '{data_nascita}',                        desc: 'Data di nascita' },
  { key: '{citta_residenza}',                     desc: 'Città di residenza (comune)' },
  { key: '{indirizzo_residenza}',                 desc: 'Via / Piazza' },
  { key: '{totale_lordo_liquidato}',              desc: 'Totale lordo liquidato (€)' },
  { key: '{totale_ritenuta_acconto_liquidato}',   desc: 'Ritenuta d\'acconto (20%)' },
  { key: '{totale_netto_liquidato}',              desc: 'Netto liquidato (€)' },
  { key: '{citta_residenza_collaboratore}',       desc: 'Città per luogo di firma (comune)' },
  { key: '{data_corrente}',                       desc: 'Data di oggi (DD/MM/AAAA)' },
  { key: '{firma_collaboratore}',                 desc: 'Firma collaboratore (PNG)' },
];

const sectionCls = 'rounded-2xl bg-card border border-border';
const sectionHeader = 'px-5 py-4 border-b border-border';

const TEMPLATE_TIPOS: ContractTemplateType[] = ['OCCASIONALE', 'RICEVUTA_PAGAMENTO'];

export default function ContractTemplateManager({ templates: initial }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [uploading, setUploading] = useState<ContractTemplateType | null>(null);
  const [showMarkers, setShowMarkers] = useState(false);

  const templateMap = Object.fromEntries(templates.map((t) => [t.tipo, t]));

  const handleUpload = async (tipo: ContractTemplateType, file: File) => {
    setUploading(tipo);
    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('file', file);

    const res = await fetch('/api/admin/contract-templates', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(null);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante il caricamento', { duration: 5000 });
      return;
    }

    toast.success('Template caricato con successo.');
    const refreshRes = await fetch('/api/admin/contract-templates');
    const refreshData = await refreshRes.json();
    setTemplates(refreshData.templates ?? []);
  };

  return (
    <div className="space-y-4">
      {/* Template slots */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Template documenti</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carica un file PDF per ogni tipo. Ogni caricamento sostituisce il template precedente.
            Solo file PDF.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {TEMPLATE_TIPOS.map((tipo) => {
            const tpl = templateMap[tipo];
            const isUploading = uploading === tipo;
            return (
              <div key={tipo} className="flex items-center justify-between rounded-xl bg-muted border border-border px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{CONTRACT_TEMPLATE_LABELS[tipo]}</p>
                  {tpl ? (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tpl.file_name} · {new Date(tpl.uploaded_at).toLocaleDateString('it-IT')}
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Nessun template caricato</p>
                  )}
                </div>
                <label className={`ml-4 flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer
                  ${isUploading
                    ? 'bg-accent text-muted-foreground pointer-events-none'
                    : tpl
                      ? 'bg-accent hover:bg-muted text-foreground'
                      : 'bg-brand hover:bg-brand/90 text-white'
                  }`}
                >
                  {isUploading ? 'Caricamento…' : tpl ? 'Sostituisci' : 'Carica'}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(tipo, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Markers reference — collapsible */}
      <div className={sectionCls}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowMarkers((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left h-auto rounded-none"
        >
          <div>
            <h2 className="text-sm font-medium text-foreground">Marcatori disponibili</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inserisci questi marcatori nel PDF template — verranno sostituiti automaticamente.
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-4 ${showMarkers ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>

        {showMarkers && (
          <div className="border-t border-border px-5 pb-5 space-y-6">
            {/* Contratto section */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Contratto occasionale
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {CONTRATTO_MARKERS.map(({ key, desc }) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <code className="rounded bg-muted border border-border px-2 py-0.5 text-blue-700 dark:text-blue-300 font-mono flex-shrink-0">
                      {key}
                    </code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ricevuta section */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Ricevuta di pagamento
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {RICEVUTA_MARKERS.map(({ key, desc }) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <code className="rounded bg-muted border border-border px-2 py-0.5 text-blue-700 dark:text-blue-300 font-mono flex-shrink-0">
                      {key}
                    </code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Sintassi: testo visibile tra graffe singole nel PDF. Es.: <code className="text-muted-foreground">&#123;nome&#125;</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

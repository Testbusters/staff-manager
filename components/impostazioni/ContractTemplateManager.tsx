'use client';

import { useState } from 'react';
import { CONTRACT_TEMPLATE_LABELS, type ContractTemplateType } from '@/lib/types';
import { Button } from '@/components/ui/button';

type Template = {
  id: string;
  tipo: ContractTemplateType;
  file_name: string;
  uploaded_at: string;
};

type Props = { templates: Template[] };

const PLACEHOLDERS = [
  { key: '{nome}',           desc: 'Nome collaboratore' },
  { key: '{cognome}',        desc: 'Cognome collaboratore' },
  { key: '{codice_fiscale}', desc: 'Codice fiscale' },
  { key: '{data_nascita}',   desc: 'Data di nascita' },
  { key: '{luogo_nascita}',  desc: 'Luogo di nascita' },
  { key: '{comune}',         desc: 'Comune di residenza' },
  { key: '{indirizzo}',      desc: 'Via e numero civico' },
  { key: '{email}',          desc: 'Email collaboratore' },
  { key: '{telefono}',       desc: 'Telefono collaboratore' },
  { key: '{iban}',           desc: 'IBAN' },
  { key: '{compenso_lordo}', desc: 'Compenso lordo (€)' },
  { key: '{data_inizio}',    desc: 'Data inizio contratto' },
  { key: '{data_fine}',      desc: 'Data fine contratto' },
  { key: '{numero_rate}',    desc: 'Numero di rate' },
  { key: '{importo_rata}',   desc: 'Importo rata (€)' },
];

const sectionCls = 'rounded-2xl bg-card border border-border';
const sectionHeader = 'px-5 py-4 border-b border-border';

export default function ContractTemplateManager({ templates: initial }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [uploading, setUploading] = useState<ContractTemplateType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  const templateMap = Object.fromEntries(templates.map((t) => [t.tipo, t]));

  const handleUpload = async (tipo: ContractTemplateType, file: File) => {
    setUploading(tipo);
    setError(null);
    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('file', file);

    const res = await fetch('/api/admin/contract-templates', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(null);

    if (!res.ok) {
      setError(data.error ?? 'Errore durante il caricamento');
      return;
    }

    // Refresh template list
    const refreshRes = await fetch('/api/admin/contract-templates');
    const refreshData = await refreshRes.json();
    setTemplates(refreshData.templates ?? []);
  };

  return (
    <div className="space-y-4">
      {/* Templates */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Template contratti</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carica un file .docx per ogni tipologia. Il template viene sostituito ad ogni caricamento.
          </p>
        </div>
        <div className="p-5">
          {(() => {
            const tipo: ContractTemplateType = 'OCCASIONALE';
            const tpl = templateMap[tipo];
            const isUploading = uploading === tipo;
            return (
              <div className="flex items-center justify-between rounded-xl bg-muted border border-border px-4 py-3">
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
                      ? 'bg-accent hover:bg-gray-600 text-foreground'
                      : 'bg-brand hover:bg-brand/90 text-white'
                  }`}
                >
                  {isUploading ? 'Caricamento…' : tpl ? 'Sostituisci' : 'Carica'}
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
          })()}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Placeholders reference */}
      <div className={sectionCls}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowPlaceholders((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left h-auto rounded-none"
        >
          <div>
            <h2 className="text-sm font-medium text-foreground">Segnaposto disponibili</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inserisci questi segnaposto nel .docx — verranno sostituiti automaticamente.
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-4 ${showPlaceholders ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
        {showPlaceholders && (
          <div className="border-t border-border px-5 pb-5">
            <div className="mt-4 grid grid-cols-1 gap-1.5">
              {PLACEHOLDERS.map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-3 text-xs">
                  <code className="rounded bg-muted border border-border px-2 py-0.5 text-blue-700 dark:text-blue-300 font-mono flex-shrink-0">
                    {key}
                  </code>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Sintassi: segnaposto tra singole graffe. Es.: <code className="text-muted-foreground">&#123;nome&#125;</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

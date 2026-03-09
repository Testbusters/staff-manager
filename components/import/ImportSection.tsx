'use client';

import { useState } from 'react';
import { Users, FileText, Receipt, History, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

type ImportType = 'collaboratori' | 'contratti' | 'cu';
type SubTab = 'anteprima' | 'storico';

const TYPES = [
  { id: 'collaboratori' as ImportType, label: 'Collaboratori', icon: Users,    cta: 'Importa Collaboratori' },
  { id: 'contratti'     as ImportType, label: 'Contratti',     icon: FileText, cta: 'Importa Contratti' },
  { id: 'cu'            as ImportType, label: 'CU',            icon: Receipt,  cta: 'Importa CU' },
];

export default function ImportSection() {
  const [activeType, setActiveType] = useState<ImportType>('collaboratori');
  const [subTab, setSubTab] = useState<SubTab>('anteprima');
  const [sheetUrl, setSheetUrl] = useState('');

  const handleTypeChange = (type: ImportType) => {
    setActiveType(type);
    setSubTab('anteprima');
    setSheetUrl('');
  };

  const typeCls = (id: ImportType) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeType === id
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  const subTabCls = (t: SubTab) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      subTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  const activeCfg = TYPES.find((t) => t.id === activeType)!;

  return (
    <div className="space-y-6">
      {/* Outer tab bar: import type */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={typeCls(id)}
            onClick={() => handleTypeChange(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Inner tab bar + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className={subTabCls('anteprima')}
            onClick={() => setSubTab('anteprima')}
          >
            Anteprima
          </button>
          <button
            type="button"
            className={subTabCls('storico')}
            onClick={() => setSubTab('storico')}
          >
            <History className="h-4 w-4" />
            Storico
          </button>
        </div>

        {subTab === 'anteprima' && (
          <Button
            disabled
            title="Carica prima un'anteprima dal foglio Google."
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {activeCfg.cta}
          </Button>
        )}
      </div>

      {/* Content area */}
      {subTab === 'anteprima' ? (
        <div className="space-y-6">
          {/* GSheet URL input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              URL foglio Google
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                disabled
                className="bg-brand hover:bg-brand/90 text-white"
              >
                Carica anteprima
              </Button>
            </div>
          </div>

          <EmptyState
            icon={Link}
            title="Nessun dato da mostrare"
            description="Inserisci l'URL del foglio Google e clicca «Carica anteprima»."
          />
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="Nessun import eseguito"
          description="Gli import completati appariranno qui."
        />
      )}
    </div>
  );
}

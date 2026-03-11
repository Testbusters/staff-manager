'use client';

import { useState } from 'react';
import { Users, FileText, Receipt } from 'lucide-react';
import ImportCollaboratoriSection from './ImportCollaboratoriSection';
import ImportCUSection from './ImportCUSection';
import ImportContrattiSection from './ImportContrattiSection';

type ImportType = 'collaboratori' | 'contratti' | 'cu';

const TYPES = [
  { id: 'collaboratori' as ImportType, label: 'Collaboratori', icon: Users },
  { id: 'contratti'     as ImportType, label: 'Contratti',     icon: FileText },
  { id: 'cu'            as ImportType, label: 'CU',            icon: Receipt },
];

export default function ImportSection() {
  const [activeType, setActiveType] = useState<ImportType>('collaboratori');

  const typeCls = (id: ImportType) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeType === id
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="space-y-6">
      {/* Outer tab bar: import type */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={typeCls(id)}
            onClick={() => setActiveType(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {activeType === 'collaboratori' && <ImportCollaboratoriSection />}
      {activeType === 'cu' && <ImportCUSection />}
      {activeType === 'contratti' && <ImportContrattiSection />}
    </div>
  );
}

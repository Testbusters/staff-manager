'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type MassimaleImpact = {
  collaboratorId: string;
  collabName: string;
  massimale: number;
  already_approved: number;
  totale: number;
  eccedenza: number;
  items: Array<{
    id: string;
    importo: number;
    label: string | null;
    date: string | null;
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  impacts: MassimaleImpact[];
  entityType: 'compensi' | 'rimborsi';
};

function ImpactCard({ impact, entityType }: { impact: MassimaleImpact; entityType: 'compensi' | 'rimborsi' }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/5 transition"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <span className="flex-1 font-medium text-sm text-foreground">{impact.collabName}</span>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Massimale: <span className="text-foreground">€{impact.massimale.toFixed(2)}</span></span>
          <span>Questi: <span className="text-foreground">€{impact.totale.toFixed(2)}</span></span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            +€{impact.eccedenza.toFixed(2)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-500/20 px-4 py-2 space-y-1">
          {impact.already_approved > 0 && (
            <div className="flex items-center justify-between py-1 text-xs text-muted-foreground border-b border-amber-500/10 mb-1">
              <span>Già approvato (anno corrente)</span>
              <span className="font-medium">€{impact.already_approved.toFixed(2)}</span>
            </div>
          )}
          {impact.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">
                {item.label ?? (entityType === 'compensi' ? 'Compenso' : 'Rimborso')}
                {item.date && (
                  <span className="ml-2">
                    ({new Date(item.date).toLocaleDateString('it-IT')})
                  </span>
                )}
              </span>
              <span className="font-medium text-foreground">€{item.importo.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MassimaleCheckModal({ open, onClose, impacts, entityType }: Props) {
  const totalEccedenza = impacts.reduce((s, i) => s + i.eccedenza, 0);
  const count = impacts.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 pr-10">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle>Verifica massimale</DialogTitle>
          </div>
          <DialogDescription>
            {count} collaborator{count > 1 ? 'i superano' : 'e supera'} il massimale previsto.
            Chiudi e rivedi manualmente le voci interessate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {impacts.map((impact) => (
            <ImpactCard key={impact.collaboratorId} impact={impact} entityType={entityType} />
          ))}
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Eccedenza totale</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            +€{totalEccedenza.toFixed(2)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Chiudi e rivedi manualmente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

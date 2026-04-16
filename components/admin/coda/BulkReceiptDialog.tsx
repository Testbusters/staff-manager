'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export type BulkReceiptItem = { id: string; collabName: string; importo: number };

export default function BulkReceiptDialog({
  open,
  onClose,
  items,
  onConfirm,
  entityLabel,
}: {
  open: boolean;
  onClose: () => void;
  items: BulkReceiptItem[];
  onConfirm: () => void;
  entityLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Genera ricevute di pagamento</DialogTitle>
          <DialogDescription>
            Verranno generate le ricevute per i {items.length} {entityLabel} liquidati.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-60">
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="text-foreground">{item.collabName}</span>
                <span className="text-muted-foreground tabular-nums">€{item.importo.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
              <span>Totale</span>
              <span className="tabular-nums">€{items.reduce((s, i) => s + i.importo, 0).toFixed(2)}</span>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button className="bg-brand hover:bg-brand/90 text-white" onClick={onConfirm}>Genera</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

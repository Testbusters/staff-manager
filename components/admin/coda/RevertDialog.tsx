'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export default function RevertDialog({
  open,
  onClose,
  description,
  note,
  onNoteChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  description: string;
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rimetti in attesa</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Motivazione obbligatoria…"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            variant="outline"
            className="border-amber-500 text-amber-700 hover:bg-amber-500/10"
            onClick={onConfirm}
            disabled={loading || note.trim().length === 0}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

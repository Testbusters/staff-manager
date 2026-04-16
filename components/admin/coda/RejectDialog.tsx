'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export default function RejectDialog({
  open,
  onClose,
  title,
  description,
  note,
  onNoteChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
          <DialogTitle>{title}</DialogTitle>
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
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || note.trim().length === 0}
          >
            Conferma rifiuto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

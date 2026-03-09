'use client';

import { useState } from 'react';
import { RefreshCw, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generatePassword } from '@/lib/password';

interface ResetPasswordDialogProps {
  collaboratorId: string;
}

export default function ResetPasswordDialog({ collaboratorId }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setPassword(generatePassword());
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setPassword('');
  };

  const handleRegenerate = () => {
    setPassword(generatePassword());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    toast.success('Password copiata.');
  };

  const handleConfirm = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/collaboratori/${collaboratorId}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success(`Password reimpostata: ${password}`, { duration: 10000 });
      handleClose();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Errore durante la reimpostazione.');
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpen}
      >
        Reimposta password
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reimposta password</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              La password generata sostituirà quella attuale del collaboratore.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nuova password</label>
              <div className="flex gap-2">
                <Input
                  value={password}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleRegenerate}
                  aria-label="Rigenera password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  aria-label="Copia password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button
                className="bg-brand hover:bg-brand/90 text-white"
                onClick={handleConfirm}
                disabled={saving}
              >
                {saving ? 'Salvataggio...' : 'Conferma'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

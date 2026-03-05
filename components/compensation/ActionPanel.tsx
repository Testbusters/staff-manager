'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role, CompensationStatus, Compensation } from '@/lib/types';
import type { CompensationAction } from '@/lib/compensation-transitions';
import { canTransition } from '@/lib/compensation-transitions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import CompensationEditModal from './CompensationEditModal';

interface ActionPanelProps {
  compensationId: string;
  stato: CompensationStatus;
  role: Role;
  compensation: Compensation;
}

export default function ActionPanel({ compensationId, stato, role, compensation }: ActionPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  // Mark liquidated modal
  const [showLiquidatedModal, setShowLiquidatedModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  const canEdit =
    (role === 'amministrazione' || role === 'responsabile_compensi') &&
    stato === 'IN_ATTESA';

  const perform = async (action: CompensationAction, extra?: Record<string, unknown>) => {
    setLoading(action);
    setError(null);

    const res = await fetch(`/api/compensations/${compensationId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? 'Errore durante la transizione');
      return;
    }

    router.refresh();
  };

  const actions: Array<{
    action: CompensationAction;
    label: string;
    variant: 'primary' | 'danger' | 'secondary';
    onClick: () => void;
  }> = [];

  // responsabile_compensi cannot approve, reject, or liquidate — admin only
  if (role !== 'responsabile_compensi') {
    if (canTransition(role, stato, 'approve').ok) {
      actions.push({ action: 'approve', label: 'Approva', variant: 'primary', onClick: () => perform('approve') });
    }
    if (canTransition(role, stato, 'reject').ok) {
      actions.push({ action: 'reject', label: 'Rifiuta', variant: 'danger', onClick: () => setShowRejectModal(true) });
    }
    if (canTransition(role, stato, 'mark_liquidated').ok) {
      actions.push({ action: 'mark_liquidated', label: 'Segna come liquidato', variant: 'primary', onClick: () => setShowLiquidatedModal(true) });
    }
  }
  if (canTransition(role, stato, 'reopen').ok) {
    actions.push({ action: 'reopen', label: 'Riapri', variant: 'secondary', onClick: () => perform('reopen') });
  }

  if (actions.length === 0 && !canEdit) return null;

  return (
    <>
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Azioni</p>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-800/40 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              disabled={loading !== null}
            >
              Modifica
            </Button>
          )}
          {actions.map((a) => (
            <Button
              key={a.action}
              onClick={a.onClick}
              disabled={loading !== null}
              variant={a.variant === 'danger' ? 'destructive' : a.variant === 'secondary' ? 'outline' : undefined}
              className={a.variant === 'primary' ? 'bg-blue-600 hover:bg-blue-500 text-white' : undefined}
            >
              {loading === a.action ? 'Attendere…' : a.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reject modal */}
      <Dialog open={showRejectModal} onOpenChange={(v) => { if (!v) { setShowRejectModal(false); setRejectNote(''); setError(null); } }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">Rifiuta compenso</DialogTitle>
          </DialogHeader>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Motivazione del rifiuto
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="Descrivi il motivo del rifiuto…"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800/40 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => { setShowRejectModal(false); setRejectNote(''); setError(null); }}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={rejectNote.trim().length === 0 || loading !== null}
              onClick={async () => {
                await perform('reject', { note: rejectNote });
                setShowRejectModal(false);
                setRejectNote('');
              }}
            >
              {loading === 'reject' ? 'Attendere…' : 'Conferma rifiuto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <CompensationEditModal
        open={showEditModal}
        compensation={compensation}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => { setShowEditModal(false); router.refresh(); }}
      />

      {/* Mark liquidated modal */}
      <Dialog open={showLiquidatedModal} onOpenChange={(v) => { if (!v) { setShowLiquidatedModal(false); setPaymentReference(''); setError(null); } }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">Segna come liquidato</DialogTitle>
          </DialogHeader>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Riferimento pagamento
              <span className="text-muted-foreground ml-1">(opzionale)</span>
            </label>
            <Input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Es. CRO, numero bonifico…"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800/40 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => { setShowLiquidatedModal(false); setPaymentReference(''); setError(null); }}
            >
              Annulla
            </Button>
            <Button
              disabled={loading !== null}
              className="bg-emerald-700 hover:bg-emerald-600 text-white"
              onClick={async () => {
                await perform('mark_liquidated', { payment_reference: paymentReference || undefined });
                setShowLiquidatedModal(false);
                setPaymentReference('');
              }}
            >
              {loading === 'mark_liquidated' ? 'Attendere…' : 'Conferma liquidazione'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { LiquidazioneRequest } from '@/lib/types';

type RequestWithCollab = LiquidazioneRequest & { collabName: string };

interface Props {
  requests: RequestWithCollab[];
}

function maskIban(iban: string) {
  if (iban.length <= 8) return iban;
  return iban.slice(0, 4) + '****' + iban.slice(-4);
}

export default function CodaLiquidazioni({ requests: initialRequests }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestWithCollab[]>(initialRequests);
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  async function handleAction(id: string, action: 'accetta' | 'annulla', noteAdmin?: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/liquidazione-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(noteAdmin !== undefined ? { note_admin: noteAdmin } : {}),
        }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        toast.success(action === 'accetta' ? 'Liquidazione accettata.' : 'Richiesta annullata.');
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Errore durante l\'operazione.');
      }
    } finally {
      setLoading(null);
    }
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Nessuna richiesta di liquidazione"
        description="Non ci sono richieste di liquidazione in attesa."
      />
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-card border border-border overflow-hidden w-fit">
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Collaboratore</TableHead>
              <TableHead>Importo netto</TableHead>
              <TableHead>IBAN</TableHead>
              <TableHead>P.IVA</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id} className="hover:bg-muted/60">
                <TableCell className="font-medium">{req.collabName}</TableCell>
                <TableCell className="font-mono text-sm">
                  €{req.importo_netto_totale.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {maskIban(req.iban)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {req.ha_partita_iva ? 'Sì' : 'No'}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {req.compensation_ids.length + req.expense_ids.length}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(req.created_at).toLocaleDateString('it-IT')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-brand hover:bg-brand/90 text-white text-xs h-7"
                          disabled={loading === req.id}
                        >
                          Accetta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Accettare la richiesta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            I {req.compensation_ids.length + req.expense_ids.length} record selezionati da <strong>{req.collabName}</strong> verranno contrassegnati come LIQUIDATO.
                            Importo netto totale: <strong>€{req.importo_netto_totale.toFixed(2)}</strong>.
                            <br />IBAN: <span className="font-mono">{req.iban}</span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleAction(req.id, 'accetta')}
                            disabled={loading === req.id}
                          >
                            Accetta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      disabled={loading === req.id}
                      onClick={() => {
                        setRejectNote('');
                        setRejectDialogId(req.id);
                      }}
                    >
                      Rifiuta
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog with optional note */}
      <Dialog open={!!rejectDialogId} onOpenChange={(open) => { if (!open) setRejectDialogId(null); }}>
        <DialogContent className="max-w-sm pr-10">
          <DialogHeader>
            <DialogTitle>Rifiutare la richiesta?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La richiesta di liquidazione verrà annullata. Il collaboratore riceverà una notifica.
            </p>
            <Textarea
              placeholder="Nota per il collaboratore (opzionale)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)}>
              Annulla
            </Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              disabled={loading === rejectDialogId}
              onClick={async () => {
                if (!rejectDialogId) return;
                const id = rejectDialogId;
                setRejectDialogId(null);
                await handleAction(id, 'annulla', rejectNote || undefined);
              }}
            >
              Rifiuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

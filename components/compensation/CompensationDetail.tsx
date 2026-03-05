import type { Compensation } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';

type CollaboratorInfo = {
  nome: string | null;
  cognome: string | null;
  username: string | null;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-border last:border-0">
      <span className="w-40 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('it-IT');
}

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function CompensationDetail({
  compensation,
  competenzaLabel,
  collaborator,
}: {
  compensation: Compensation;
  competenzaLabel?: string | null;
  collaborator?: CollaboratorInfo | null;
}) {
  const c = compensation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-medium text-foreground break-words">{c.nome_servizio_ruolo ?? '—'}</p>
          {competenzaLabel && (
            <span className="mt-1 inline-block text-xs font-medium text-blue-300 bg-blue-900/40 border border-blue-700/40 rounded-full px-2.5 py-0.5">
              {competenzaLabel}
            </span>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge stato={c.stato} />
        </div>
      </div>

      {/* Collaborator info — visible to responsabile_compensi and amministrazione only */}
      {collaborator && (
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Collaboratore</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-sm text-foreground">
                {[collaborator.nome, collaborator.cognome].filter(Boolean).join(' ') || '—'}
              </span>
              {collaborator.username && (
                <span className="text-sm text-muted-foreground">@{collaborator.username}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General fields */}
      <Card>
        <CardContent className="px-4">
          <Row label="Data competenza" value={formatDate(c.data_competenza)} />
          {competenzaLabel && <Row label="Competenza" value={competenzaLabel} />}
          <Row label="Nome servizio / Ruolo" value={c.nome_servizio_ruolo} />
          {c.info_specifiche && <Row label="Info specifiche" value={c.info_specifiche} />}
        </CardContent>
      </Card>

      {/* Financial fields */}
      <Card>
        <CardContent className="px-4">
          <Row label="Importo lordo" value={formatCurrency(c.importo_lordo)} />
          <Row label="Ritenuta acconto (20%)" value={formatCurrency(c.ritenuta_acconto)} />
          <Row label="Importo netto" value={
            <span className="font-medium text-green-400">{formatCurrency(c.importo_netto)}</span>
          } />
        </CardContent>
      </Card>

      {/* Rejection note */}
      {c.rejection_note && (
        <div className="rounded-xl bg-red-900/20 border border-red-700/40 px-4 py-3">
          <p className="text-xs font-medium text-red-400 mb-1">Motivo rifiuto</p>
          <p className="text-sm text-red-200">{c.rejection_note}</p>
        </div>
      )}

      {/* Payment info */}
      {c.liquidated_at && (
        <div className="rounded-xl bg-emerald-900/20 border border-emerald-700/40 px-4 py-3">
          <p className="text-xs font-medium text-emerald-400 mb-1">Pagamento</p>
          <Row label="Data liquidazione" value={formatDate(c.liquidated_at)} />
          {c.payment_reference && <Row label="Riferimento" value={c.payment_reference} />}
        </div>
      )}
    </div>
  );
}

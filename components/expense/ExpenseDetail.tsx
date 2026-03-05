import type { Expense, ExpenseAttachment } from '@/lib/types';
import { EXPENSE_CATEGORIA_BADGE } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/compensation/StatusBadge';

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

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function ExpenseDetail({
  expense,
  attachments,
  collaborator,
}: {
  expense: Expense;
  attachments: ExpenseAttachment[];
  collaborator?: { nome: string | null; cognome: string | null } | null;
}) {
  const e = expense;
  const collaboratorName = collaborator
    ? [collaborator.nome, collaborator.cognome].filter(Boolean).join(' ')
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {collaboratorName && (
            <p className="text-xs text-muted-foreground mb-0.5">{collaboratorName}</p>
          )}
          <p className="text-lg font-medium text-foreground">{e.descrizione}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORIA_BADGE[e.categoria]}`}>
              {e.categoria}
            </span>
            {e.data_spesa && (
              <span className="text-sm text-muted-foreground">{formatDate(e.data_spesa)}</span>
            )}
          </div>
        </div>
        <StatusBadge stato={e.stato} />
      </div>

      {/* Info block */}
      <Card>
        <CardContent className="px-4">
          <Row label="Data spesa" value={formatDate(e.data_spesa)} />
          <Row label="Importo" value={
            <span className="font-medium text-green-400">{formatCurrency(e.importo)}</span>
          } />
          <Row label="Descrizione" value={e.descrizione} />
          <Row label="Richiesta il" value={formatDateTime(e.created_at)} />
        </CardContent>
      </Card>

      {/* Rejection note */}
      {e.rejection_note && (
        <div className="rounded-xl bg-red-900/20 border border-red-700/40 px-4 py-3">
          <p className="text-xs font-medium text-red-400 mb-1">Motivo rifiuto</p>
          <p className="text-sm text-red-200">{e.rejection_note}</p>
        </div>
      )}

      {/* Payment info */}
      {e.liquidated_at && (
        <div className="rounded-xl bg-emerald-900/20 border border-emerald-700/40 px-4 py-3">
          <p className="text-xs font-medium text-emerald-400 mb-1">Pagamento</p>
          <Row label="Data liquidazione" value={formatDate(e.liquidated_at)} />
          {e.payment_reference && <Row label="Riferimento" value={e.payment_reference} />}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Allegati</p>
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center gap-2">
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition min-w-0"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="truncate">{att.file_name}</span>
                  </a>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">{formatDateTime(att.created_at)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

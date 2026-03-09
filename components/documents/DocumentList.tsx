'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Document, DocumentType, DocumentMacroType } from '@/lib/types';
import { DOCUMENT_SIGN_STATUS_LABELS, DOCUMENT_MACRO_TYPE, DOCUMENT_MACRO_TYPE_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import DocumentAdminModal from '@/components/documents/DocumentAdminModal';

interface DocumentRow extends Document {
  collaborators?: { nome: string; cognome: string } | null;
}

interface Props {
  documents: DocumentRow[];
  isAdmin: boolean;
}

function TypeBadge({ tipo }: { tipo: DocumentType | string }) {
  if (tipo === 'CONTRATTO_OCCASIONALE') {
    return <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/40">Occasionale</span>;
  }
  if (tipo === 'CU') {
    return <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/40">CU</span>;
  }
  if (tipo === 'RICEVUTA_PAGAMENTO') {
    return <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/40">Ricevuta</span>;
  }
  return <span className="text-muted-foreground text-xs">{tipo}</span>;
}

function SignBadge({ stato }: { stato: string }) {
  const config: Record<string, { variant: 'outline' | 'secondary'; className?: string }> = {
    DA_FIRMARE:    { variant: 'outline', className: 'border-amber-500 text-amber-700 dark:border-amber-600 dark:text-amber-400' },
    FIRMATO:       { variant: 'outline', className: 'border-green-500 text-green-700 dark:border-green-600 dark:text-green-400' },
    NON_RICHIESTO: { variant: 'secondary' },
  };
  const { variant, className } = config[stato] ?? config.NON_RICHIESTO;
  return (
    <Badge variant={variant} className={className}>
      {DOCUMENT_SIGN_STATUS_LABELS[stato as keyof typeof DOCUMENT_SIGN_STATUS_LABELS] ?? stato}
    </Badge>
  );
}

const MACRO_ORDER: DocumentMacroType[] = ['CONTRATTO', 'CU', 'RICEVUTA'];

export default function DocumentList({ documents, isAdmin }: Props) {
  const [modalDocId, setModalDocId] = useState<string | null>(null);

  // Group documents by macro type
  const grouped = new Map<DocumentMacroType, DocumentRow[]>();
  for (const doc of documents) {
    const macro = DOCUMENT_MACRO_TYPE[doc.tipo as DocumentType] ?? ('CU' as DocumentMacroType);
    const arr = grouped.get(macro) ?? [];
    arr.push(doc);
    grouped.set(macro, arr);
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <EmptyState icon={FileText} title="Nessun documento disponibile" description="Non sono presenti documenti per questo collaboratore." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {MACRO_ORDER.filter((macro) => grouped.has(macro)).map((macro) => {
        const docs = grouped.get(macro)!;
        return (
          <Card key={macro}>
            <CardContent className="overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{DOCUMENT_MACRO_TYPE_LABELS[macro]}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">({docs.length})</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead>Collaboratore</TableHead>
                  )}
                  <TableHead>Titolo</TableHead>
                  {(macro === 'CONTRATTO' || macro === 'RICEVUTA') && (
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  )}
                  <TableHead className="hidden md:table-cell">Anno</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className={`hover:bg-muted/60 ${isAdmin ? 'cursor-pointer' : ''}`}
                    onClick={isAdmin ? () => setModalDocId(doc.id) : undefined}
                  >
                    {isAdmin && (
                      <TableCell className="text-foreground text-sm">
                        {doc.collaborators
                          ? `${doc.collaborators.nome} ${doc.collaborators.cognome}`
                          : '—'}
                      </TableCell>
                    )}
                    <TableCell className="text-foreground font-medium text-sm">{doc.titolo}</TableCell>
                    {(macro === 'CONTRATTO' || macro === 'RICEVUTA') && (
                      <TableCell className="hidden sm:table-cell">
                        <TypeBadge tipo={doc.tipo} />
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground hidden md:table-cell text-sm">
                      {doc.anno ?? '—'}
                    </TableCell>
                    <TableCell>
                      <SignBadge stato={doc.stato_firma} />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell tabular-nums text-xs">
                      {new Date(doc.requested_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    {!isAdmin && (
                      <TableCell className="text-right">
                        <Link
                          href={`/documenti/${doc.id}`}
                          className="text-xs text-link hover:text-link/80"
                        >
                          Apri →
                        </Link>
                      </TableCell>
                    )}
                    {isAdmin && <TableCell />}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        );
      })}

      {isAdmin && (
        <DocumentAdminModal
          docId={modalDocId}
          onClose={() => setModalDocId(null)}
        />
      )}
    </div>
  );
}

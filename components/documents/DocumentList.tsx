'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { FileText, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Document, DocumentType, DocumentMacroType } from '@/lib/types';
import { DOCUMENT_SIGN_STATUS_LABELS, DOCUMENT_MACRO_TYPE, DOCUMENT_MACRO_TYPE_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import DocumentAdminModal from '@/components/documents/DocumentAdminModal';

interface DocumentRow extends Document {
  collaborators?: { nome: string; cognome: string } | null;
}

interface CollaboratorOption {
  id: string;
  nome: string;
  cognome: string;
  username: string | null;
  email: string;
  user_id: string;
}

function CollabAvatar({ collab }: { collab: CollaboratorOption }) {
  const initials = `${collab.nome[0] ?? ''}${collab.cognome[0] ?? ''}`.toUpperCase();
  const avatarUrl = collab.user_id
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${collab.user_id}/avatar`
    : null;
  const [imgFailed, setImgFailed] = useState(false);

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={`${collab.nome} ${collab.cognome}`}
        onError={() => setImgFailed(true)}
        className="shrink-0 w-10 h-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="shrink-0 w-10 h-10 rounded-full bg-brand/15 dark:bg-brand/20 flex items-center justify-center">
      <span className="text-sm font-semibold text-brand">{initials}</span>
    </div>
  );
}

interface Props {
  documents: DocumentRow[];
  isAdmin: boolean;
  collaborators?: CollaboratorOption[];
}

// ── Shared sub-components ────────────────────────────────────────

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

// ── Grouped document table ────────────────────────────────────────

function DocumentGroups({
  documents,
  isAdmin,
  onRowClick,
}: {
  documents: DocumentRow[];
  isAdmin: boolean;
  onRowClick?: (id: string) => void;
}) {
  const router = useRouter();
  const grouped = new Map<DocumentMacroType, DocumentRow[]>();
  for (const doc of documents) {
    const macro = DOCUMENT_MACRO_TYPE[doc.tipo as DocumentType] ?? ('CU' as DocumentMacroType);
    const arr = grouped.get(macro) ?? [];
    arr.push(doc);
    grouped.set(macro, arr);
  }
  // Sort: DA_FIRMARE first within each group
  for (const [key, docs] of grouped) {
    grouped.set(key, [...docs].sort((a, b) => {
      if (a.stato_firma === 'DA_FIRMARE' && b.stato_firma !== 'DA_FIRMARE') return -1;
      if (a.stato_firma !== 'DA_FIRMARE' && b.stato_firma === 'DA_FIRMARE') return 1;
      return 0;
    }));
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState icon={FileText} title="Nessun documento" description="Questo collaboratore non ha ancora documenti." />
        </CardContent>
      </Card>
    );
  }

  // colspan = 6 for both views:
  // admin:  Collaboratore + Titolo + Tipo + Anno + Stato + Data
  // collab: Titolo + Tipo + Anno + Stato + Data + (Apri)
  const colSpan = 6;

  return (
    <Card className="w-fit">
      <CardContent className="overflow-hidden p-0">
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>Collaboratore</TableHead>}
              <TableHead className={isAdmin ? '' : 'min-w-48'}>Titolo</TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap w-28">Tipo</TableHead>
              <TableHead className="hidden md:table-cell whitespace-nowrap w-16">Anno</TableHead>
              <TableHead className="whitespace-nowrap w-44">Stato</TableHead>
              <TableHead className="hidden lg:table-cell whitespace-nowrap w-28">Data</TableHead>
              {!isAdmin && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MACRO_ORDER.filter((macro) => grouped.has(macro)).map((macro) => {
              const docs = grouped.get(macro)!;
              return (
                <React.Fragment key={macro}>
                  {/* Section header row */}
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-t border-border">
                    <TableCell colSpan={colSpan} className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold tracking-tight text-foreground">
                          {DOCUMENT_MACRO_TYPE_LABELS[macro]}
                        </span>
                        <span className="inline-flex items-center justify-center rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums min-w-[1.25rem] border border-border">
                          {docs.length}
                        </span>
                        {docs.some((d) => d.stato_firma === 'DA_FIRMARE') && (
                          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Azione richiesta
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Document rows */}
                  {docs.map((doc) => {
                    const isDaFirmare = doc.stato_firma === 'DA_FIRMARE';
                    const handleRowClick = isAdmin && onRowClick
                      ? () => onRowClick(doc.id)
                      : !isAdmin
                        ? () => router.push(`/documenti/${doc.id}`)
                        : undefined;
                    return (
                      <TableRow
                        key={doc.id}
                        className={`hover:bg-muted/60 cursor-pointer ${isDaFirmare && !isAdmin ? 'border-l-2 border-l-amber-500' : ''}`}
                        onClick={handleRowClick}
                      >
                        {isAdmin && (
                          <TableCell className="text-foreground text-sm">
                            {doc.collaborators
                              ? `${doc.collaborators.nome} ${doc.collaborators.cognome}`
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-foreground font-medium text-sm">{doc.titolo}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <TypeBadge tipo={doc.tipo} />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell text-sm tabular-nums">
                          {doc.anno ?? '—'}
                        </TableCell>
                        <TableCell>
                          <SignBadge stato={doc.stato_firma} />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell tabular-nums text-xs">
                          {new Date(doc.requested_at).toLocaleDateString('it-IT')}
                        </TableCell>
                        {!isAdmin && (
                          <TableCell className="text-right whitespace-nowrap">
                            <Link
                              href={`/documenti/${doc.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-link hover:text-link/80"
                            >
                              Apri →
                            </Link>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Admin 2-step wizard ───────────────────────────────────────────

function AdminDocumentList({ collaborators }: { collaborators: CollaboratorOption[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollab, setSelectedCollab] = useState<CollaboratorOption | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [modalDocId, setModalDocId] = useState<string | null>(null);

  const filtered = searchQuery.trim()
    ? collaborators.filter((c) => {
        const q = searchQuery.toLowerCase();
        return [c.nome, c.cognome, c.username ?? '', c.email].some((f) => f.toLowerCase().includes(q));
      })
    : [];

  const selectCollab = async (c: CollaboratorOption) => {
    setSelectedCollab(c);
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?collaborator_id=${c.id}`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleModalClose = () => {
    setModalDocId(null);
    // Reset to step 1 and refresh
    setSelectedCollab(null);
    setSearchQuery('');
    setDocuments([]);
    router.refresh();
  };

  // ── Step 1: Search collaborator ──
  if (!selectedCollab) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">Seleziona un collaboratore</p>
              <p className="text-xs text-muted-foreground mb-3">
                Cerca per nome, cognome, username o email per visualizzare i documenti associati.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nome, cognome, username o email…"
                  aria-label="Cerca collaboratore"
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {filtered.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCollab(c)}
                    className="w-full text-left px-3 py-3 transition hover:bg-muted/60 space-y-0.5"
                  >
                    <p className="text-sm text-foreground font-medium">{c.cognome} {c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.email}{c.username ? ` · ${c.username}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.trim() && filtered.length === 0 && (
              <EmptyState icon={Search} title="Nessun collaboratore trovato" description="Nessun collaboratore corrisponde alla ricerca." />
            )}

            {!searchQuery.trim() && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Digita almeno una lettera per avviare la ricerca.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step 2: Show documents for selected collaborator ──
  return (
    <div className="space-y-4">
      {/* Collaborator banner */}
      <Card>
        <CardContent className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <CollabAvatar collab={selectedCollab} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {selectedCollab.cognome} {selectedCollab.nome}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground truncate">{selectedCollab.email}</span>
                {selectedCollab.username && (
                  <>
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground font-mono">{selectedCollab.username}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedCollab(null); setSearchQuery(''); setDocuments([]); }}
            className="shrink-0 text-xs"
          >
            ← Cambia
          </Button>
        </CardContent>
      </Card>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Clicca su un documento per aprirlo, modificarlo o sostituire il file.
      </p>

      {loadingDocs ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DocumentGroups
          documents={documents}
          isAdmin
          onRowClick={setModalDocId}
        />
      )}

      <DocumentAdminModal docId={modalDocId} onClose={handleModalClose} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────

export default function DocumentList({ documents, isAdmin, collaborators = [] }: Props) {
  if (isAdmin) {
    return <AdminDocumentList collaborators={collaborators} />;
  }

  // Collaboratore path: flat list passed from server
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState icon={FileText} title="Nessun documento disponibile" description="Non sono presenti documenti per questo collaboratore." />
        </CardContent>
      </Card>
    );
  }

  return <DocumentGroups documents={documents} isAdmin={false} />;
}

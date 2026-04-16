'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Pencil, RotateCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import CollaboratorAvatar from '@/components/admin/CollaboratorAvatar';
import ResetPasswordDialog from '@/components/collaboratori/ResetPasswordDialog';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_SIGN_STATUS_LABELS,
  TSHIRT_SIZES,
  type DocumentType,
  type DocumentSignStatus,
  type Role,
} from '@/lib/types';

interface DocumentRow {
  id: string;
  titolo: string;
  tipo: DocumentType;
  stato_firma: DocumentSignStatus;
  created_at: string;
}

interface CollabData {
  id: string;
  nome: string | null;
  cognome: string | null;
  codice_fiscale: string | null;
  telefono: string | null;
  email: string | null;
  tipo_contratto: string | null;
  data_ingresso: string | null;
  luogo_nascita: string | null;
  provincia_nascita: string | null;
  comune: string | null;
  provincia_residenza: string | null;
  indirizzo: string | null;
  civico_residenza: string | null;
  data_nascita: string | null;
  tshirt_size: string | null;
  sono_un_figlio_a_carico: boolean;
  importo_lordo_massimale: number | null;
  intestatario_pagamento: string | null;
  username: string | null;
  citta: string | null;
  materie_insegnate: string[] | null;
}

interface LookupOption {
  id: string;
  nome: string;
}

export interface InviteTrackingProps {
  inviteEmailSent?: boolean;
  onboardingCompleted?: boolean;
  mustChangePassword?: boolean;
}

interface CollaboratoreDetailProps extends InviteTrackingProps {
  collab: CollabData;
  userId: string | null;
  memberStatus: string | null;
  communityNames: string[];
  compensations: unknown[];
  expenses: unknown[];
  documents: DocumentRow[];
  role: Role;
  collabRole?: Role | null;
  cittaOptions?: LookupOption[];
  materiaOptions?: LookupOption[];
  telegramConnected?: boolean;
}

const MEMBER_STATUS_LABELS: Record<string, string> = {
  attivo: 'Attivo',
  uscente_con_compenso: 'Uscente con compenso',
  uscente_senza_compenso: 'Uscente senza compenso',
};

const MEMBER_STATUS_COLORS: Record<string, string> = {
  attivo: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  uscente_con_compenso: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  uscente_senza_compenso: 'bg-muted text-muted-foreground border-border',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CollaboratoreDetail({
  collab,
  memberStatus,
  userId,
  communityNames,
  documents,
  role,
  collabRole,
  cittaOptions: cittaOptionsProp = [],
  materiaOptions: materiaOptionsProp = [],
  telegramConnected = false,
  inviteEmailSent = false,
  onboardingCompleted = false,
  mustChangePassword = false,
}: CollaboratoreDetailProps) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [tgConnected, setTgConnected] = useState(telegramConnected);
  const [tgResetting, setTgResetting] = useState(false);
  const [resending, setResending] = useState(false);
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [resendCreds, setResendCreds] = useState<{ email: string; password: string } | null>(null);

  const isResponsabileProfile = collabRole === 'responsabile_compensi';

  // ── Form fields ───────────────────────────────────────────────────────────
  const [fNome, setFNome]                         = useState(collab.nome ?? '');
  const [fCognome, setFCognome]                   = useState(collab.cognome ?? '');
  const [fUsername, setFUsername]                 = useState(collab.username ?? '');
  const [fCF, setFCF]                             = useState(collab.codice_fiscale ?? '');
  const [fDataNascita, setFDataNascita]           = useState(collab.data_nascita ?? '');
  const [fLuogoNascita, setFLuogoNascita]         = useState(collab.luogo_nascita ?? '');
  const [fProvinciaNascita, setFProvinciaNascita] = useState(collab.provincia_nascita ?? '');
  const [fComune, setFComune]                     = useState(collab.comune ?? '');
  const [fProvinciaRes, setFProvinciaRes]         = useState(collab.provincia_residenza ?? '');
  const [fIndirizzo, setFIndirizzo]               = useState(collab.indirizzo ?? '');
  const [fCivico, setFCivico]                     = useState(collab.civico_residenza ?? '');
  const [fTelefono, setFTelefono]                 = useState(collab.telefono ?? '');
  const [fTshirt, setFTshirt]                     = useState(collab.tshirt_size ?? '');
  const [fSonoFiglio, setFSonoFiglio]             = useState(collab.sono_un_figlio_a_carico);
  const [fMassimale, setFMassimale]               = useState<string>(
    collab.importo_lordo_massimale != null ? String(collab.importo_lordo_massimale) : '',
  );
  const [fIntestatario, setFIntestatario]         = useState(collab.intestatario_pagamento ?? '');
  const [fCitta, setFCitta]                       = useState(collab.citta ?? '');
  const [fMaterieInsegnate, setFMaterieInsegnate] = useState<string[]>(collab.materie_insegnate ?? []);

  // Lookup options provided by the parent page (server-fetched)
  const cittaOptions   = cittaOptionsProp;
  const materiaOptions = materiaOptionsProp;

  async function resetTelegram() {
    setTgResetting(true);
    try {
      const res = await fetch(`/api/admin/collaboratori/${collab.id}/telegram`, { method: 'PATCH' });
      if (res.ok) setTgConnected(false);
    } finally {
      setTgResetting(false);
    }
  }

  async function handleResendInvite() {
    setResending(true);
    try {
      const res = await fetch(`/api/admin/collaboratori/${collab.id}/resend-invite`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Errore durante il re-invio.');
        return;
      }
      setResendCreds({ email: data.email, password: data.password });
      setCredDialogOpen(true);
      if (data.email_sent) {
        toast.success('Invito re-inviato con successo.');
      } else {
        toast.warning('Credenziali rigenerate ma email NON inviata. Comunicale manualmente.');
      }
      router.refresh();
    } finally {
      setResending(false);
    }
  }

  const openEditModal = () => {
    setFNome(collab.nome ?? '');
    setFCognome(collab.cognome ?? '');
    setFUsername(collab.username ?? '');
    setFCF(collab.codice_fiscale ?? '');
    setFDataNascita(collab.data_nascita ?? '');
    setFLuogoNascita(collab.luogo_nascita ?? '');
    setFProvinciaNascita(collab.provincia_nascita ?? '');
    setFComune(collab.comune ?? '');
    setFProvinciaRes(collab.provincia_residenza ?? '');
    setFIndirizzo(collab.indirizzo ?? '');
    setFCivico(collab.civico_residenza ?? '');
    setFTelefono(collab.telefono ?? '');
    setFTshirt(collab.tshirt_size ?? '');
    setFSonoFiglio(collab.sono_un_figlio_a_carico);
    setFMassimale(collab.importo_lordo_massimale != null ? String(collab.importo_lordo_massimale) : '');
    setFIntestatario(collab.intestatario_pagamento ?? '');
    setFCitta(collab.citta ?? '');
    setFMaterieInsegnate(collab.materie_insegnate ?? []);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    const body: Record<string, unknown> = {
      nome:                fNome.trim() || undefined,
      cognome:             fCognome.trim() || undefined,
      comune:              fComune.trim() || null,
      provincia_residenza: fProvinciaRes.trim().toUpperCase() || null,
      indirizzo:           fIndirizzo.trim() || null,
      civico_residenza:    fCivico.trim() || null,
      telefono:            fTelefono.trim() || null,
    };

    if (!isResponsabileProfile) {
      body.codice_fiscale          = fCF.trim().toUpperCase() || null;
      body.data_nascita            = fDataNascita || null;
      body.luogo_nascita           = fLuogoNascita.trim() || null;
      body.provincia_nascita       = fProvinciaNascita.trim().toUpperCase() || null;
      body.tshirt_size             = fTshirt || null;
      body.sono_un_figlio_a_carico = fSonoFiglio;
      body.importo_lordo_massimale = fMassimale !== '' ? parseFloat(fMassimale) : null;
    }

    if (role === 'amministrazione') {
      body.intestatario_pagamento = fIntestatario.trim() || null;
      if (fCitta) body.citta = fCitta;
      if (fMaterieInsegnate.length > 0) body.materie_insegnate = fMaterieInsegnate;
    }

    if (fUsername.trim().length >= 3) body.username = fUsername.trim();

    const res = await fetch(`/api/admin/collaboratori/${collab.id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setProfileSaving(false);

    if (res.ok) {
      toast.success('Profilo salvato.');
      setEditModalOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Errore durante il salvataggio.', { duration: 5000 });
    }
  };

  const fullName = [collab.nome, collab.cognome].filter(Boolean).join(' ') || 'Collaboratore';

  // ── Profile fields for read-only display ─────────────────────────────────
  const profileFields: [string, string | null | undefined][] = [
    ['Codice fiscale', collab.codice_fiscale],
    ['Tipo contratto', collab.tipo_contratto],
    ['Email', collab.email],
    ['Telefono', collab.telefono],
    ['Data di nascita', collab.data_nascita ? formatDate(collab.data_nascita) : null],
    ['Luogo di nascita', collab.luogo_nascita],
    ['Comune di residenza', collab.comune],
    ['Provincia residenza', collab.provincia_residenza],
    ['Indirizzo', collab.indirizzo ? `${collab.indirizzo}${collab.civico_residenza ? ` ${collab.civico_residenza}` : ''}` : null],
    ['Taglia t-shirt', collab.tshirt_size],
    ['Data ingresso', collab.data_ingresso ? formatDate(collab.data_ingresso) : null],
    ...(role === 'amministrazione' ? [['Intestatario conto', collab.intestatario_pagamento] as [string, string | null]] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/collaboratori">Collaboratori</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{[collab.nome, collab.cognome].filter(Boolean).join(' ') || 'Dettaglio'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ── Identity card ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <CollaboratorAvatar
            userId={userId}
            nome={collab.nome}
            cognome={collab.cognome}
            size="lg"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{fullName}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {memberStatus && (
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${MEMBER_STATUS_COLORS[memberStatus] ?? 'bg-muted text-muted-foreground border-border'}`}>
                      {MEMBER_STATUS_LABELS[memberStatus] ?? memberStatus}
                    </span>
                  )}
                  {collab.username && (
                    <span className="text-xs font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded-full">
                      @{collab.username}
                    </span>
                  )}
                  {communityNames.map((n) => (
                    <span key={n} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {role === 'amministrazione' && mustChangePassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { void handleResendInvite(); }}
                    disabled={resending}
                  >
                    <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Invio…' : 'Re-invia invito'}
                  </Button>
                )}
                {role === 'amministrazione' && (
                  <ResetPasswordDialog collaboratorId={collab.id} />
                )}
                <Button
                  size="sm"
                  onClick={openEditModal}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Modifica profilo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tracking badges ─────────────────────────────────────────────── */}
      {role === 'amministrazione' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Mail invito:</span>
            {inviteEmailSent ? (
              <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/60 dark:text-green-300 dark:border-green-800/60 px-2 py-0.5 rounded-full">
                Inviata
              </span>
            ) : (
              <span className="text-xs font-medium bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/60 dark:text-red-300 dark:border-red-800/60 px-2 py-0.5 rounded-full">
                Non inviata
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Attivazione profilo:</span>
            {onboardingCompleted ? (
              <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/60 dark:text-green-300 dark:border-green-800/60 px-2 py-0.5 rounded-full">
                Completato
              </span>
            ) : (
              <span className="text-xs font-medium bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                In attesa
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Profile data ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Anagrafica
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {profileFields.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                  {label}
                </dt>
                <dd className="text-foreground text-sm">{value}</dd>
              </div>
            ) : null,
          )}
          {!isResponsabileProfile && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                Fiscalmente a carico
              </dt>
              <dd className="text-foreground text-sm">
                {collab.sono_un_figlio_a_carico ? 'Sì' : 'No'}
              </dd>
            </div>
          )}
          {!isResponsabileProfile && collab.importo_lordo_massimale != null && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                Massimale lordo annuo
              </dt>
              <dd className="text-foreground text-sm">
                {collab.importo_lordo_massimale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </dd>
            </div>
          )}
          {collab.citta && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">Città</dt>
              <dd className="text-foreground text-sm">{collab.citta}</dd>
            </div>
          )}
          {collab.materie_insegnate && collab.materie_insegnate.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">Materie insegnate</dt>
              <dd className="text-foreground text-sm">{collab.materie_insegnate.join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* ── Telegram (admin only) ────────────────────────────────────────── */}
      {role === 'amministrazione' && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Telegram
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${tgConnected ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
              <span className="text-sm text-foreground">
                {tgConnected ? 'Account Telegram collegato' : 'Nessun account Telegram collegato'}
              </span>
            </div>
            {tgConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetTelegram}
                disabled={tgResetting}
              >
                {tgResetting ? 'Reset…' : 'Reset connessione'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Documenti ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Documenti</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState icon={FileText} title="Nessun documento." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['Titolo', 'Tipo', 'Firma', 'Data', ''].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-muted/60">
                  <TableCell className="text-foreground text-sm font-medium">{doc.titolo}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {DOCUMENT_TYPE_LABELS[doc.tipo] ?? doc.tipo}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        doc.stato_firma === 'DA_FIRMARE'
                          ? 'border-amber-500 text-amber-400'
                          : doc.stato_firma === 'FIRMATO'
                            ? 'border-emerald-500 text-emerald-400'
                            : undefined
                      }
                    >
                      {DOCUMENT_SIGN_STATUS_LABELS[doc.stato_firma] ?? doc.stato_firma}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(doc.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/documenti/${doc.id}`} className="text-xs text-link hover:text-link/80">
                      Vedi →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Resend credentials dialog ──────────────────────────────────── */}
      <Dialog open={credDialogOpen} onOpenChange={(v) => { if (!v) { setCredDialogOpen(false); setResendCreds(null); } }}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader className="pr-10">
            <DialogTitle className="text-base font-semibold text-foreground">
              Credenziali rigenerate
            </DialogTitle>
          </DialogHeader>
          {resendCreds && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Salva queste credenziali - la password non sarà più visibile dopo la chiusura.
              </p>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</label>
                <code className="block text-sm text-foreground bg-muted px-3 py-2 rounded-md select-all">{resendCreds.email}</code>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-wide mb-1">Password</label>
                <code className="block text-sm text-foreground bg-muted px-3 py-2 rounded-md font-mono select-all">{resendCreds.password}</code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit profile modal ────────────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={(v) => { if (!v) setEditModalOpen(false); }}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pr-10">
            <DialogTitle className="text-base font-semibold text-foreground">
              Modifica profilo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
            {/* Nome + Cognome */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nome</label>
                <Input value={fNome} onChange={(e) => setFNome(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cognome</label>
                <Input value={fCognome} onChange={(e) => setFCognome(e.target.value)} />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Username</label>
              <Input
                value={fUsername}
                onChange={(e) => setFUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={50}
                placeholder="username"
                className="font-mono"
              />
            </div>

            {/* Telefono */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Telefono</label>
              <Input type="tel" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} />
            </div>

            {/* Collaboratore-only fields */}
            {!isResponsabileProfile && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Codice fiscale</label>
                  <Input
                    value={fCF}
                    onChange={(e) => setFCF(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={16}
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Data di nascita</label>
                    <Input type="date" value={fDataNascita} onChange={(e) => setFDataNascita(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Città di nascita</label>
                    <Input value={fLuogoNascita} onChange={(e) => setFLuogoNascita(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Provincia di nascita</label>
                  <Input
                    value={fProvinciaNascita}
                    onChange={(e) => setFProvinciaNascita(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="font-mono uppercase w-24"
                  />
                </div>
              </>
            )}

            {/* Residenza */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Comune di residenza</label>
                <Input value={fComune} onChange={(e) => setFComune(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Provincia residenza</label>
                <Input
                  value={fProvinciaRes}
                  onChange={(e) => setFProvinciaRes(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="font-mono uppercase w-24"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Indirizzo</label>
                <Input value={fIndirizzo} onChange={(e) => setFIndirizzo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Civico</label>
                <Input value={fCivico} onChange={(e) => setFCivico(e.target.value)} maxLength={10} />
              </div>
            </div>

            {/* Collaboratore-only extra fields */}
            {!isResponsabileProfile && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Taglia t-shirt</label>
                  <Select value={fTshirt || undefined} onValueChange={setFTshirt}>
                    <SelectTrigger>
                      <SelectValue placeholder="— Non specificata —" />
                    </SelectTrigger>
                    <SelectContent>
                      {TSHIRT_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={fSonoFiglio}
                    onCheckedChange={(v) => setFSonoFiglio(!!v)}
                  />
                  <span className="text-sm text-foreground">Fiscalmente a carico</span>
                </label>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Massimale lordo annuo (max €5.000)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                    <Input
                      type="number"
                      min={1}
                      max={5000}
                      step={1}
                      value={fMassimale}
                      onChange={(e) => setFMassimale(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Admin-only */}
            {role === 'amministrazione' && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Intestatario del conto bancario
                  </label>
                  <Input
                    placeholder="Mario Rossi"
                    value={fIntestatario}
                    onChange={(e) => setFIntestatario(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Città</label>
                  <Select value={fCitta || undefined} onValueChange={setFCitta}>
                    <SelectTrigger><SelectValue placeholder="— Seleziona città —" /></SelectTrigger>
                    <SelectContent>
                      {cittaOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.nome}>{opt.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Materie insegnate</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {materiaOptions.map((opt) => {
                      const active = fMaterieInsegnate.includes(opt.nome);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setFMaterieInsegnate((prev) =>
                              active ? prev.filter((m) => m !== opt.nome) : [...prev, opt.nome],
                            )
                          }
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                            active
                              ? 'bg-brand text-white border-brand'
                              : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                          }`}
                        >
                          {opt.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={profileSaving}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                {profileSaving ? 'Salvataggio…' : 'Salva'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

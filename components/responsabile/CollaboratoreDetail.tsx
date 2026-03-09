'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import CollaboratorAvatar from '@/components/admin/CollaboratorAvatar';
import ResetPasswordDialog from '@/components/collaboratori/ResetPasswordDialog';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_SIGN_STATUS_LABELS,
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
}

interface CollaboratoreDetailProps {
  collab: CollabData;
  userId: string | null;
  memberStatus: string | null;
  communityNames: string[];
  compensations: unknown[];
  expenses: unknown[];
  documents: DocumentRow[];
  role: Role;
  collabRole?: Role | null;
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
}: CollaboratoreDetailProps) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

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
      {/* Back */}
      <Link href="/collaboratori" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
        ← Torna alla lista
      </Link>

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
                    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${MEMBER_STATUS_COLORS[memberStatus] ?? 'bg-muted text-muted-foreground border-border'}`}>
                      {MEMBER_STATUS_LABELS[memberStatus] ?? memberStatus}
                    </span>
                  )}
                  {collab.username && (
                    <span className="text-[11px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded-full">
                      @{collab.username}
                    </span>
                  )}
                  {communityNames.map((n) => (
                    <span key={n} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
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

      {/* ── Profile data ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Anagrafica
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {profileFields.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                  {label}
                </dt>
                <dd className="text-foreground text-sm">{value}</dd>
              </div>
            ) : null,
          )}
          {!isResponsabileProfile && (
            <div>
              <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                Fiscalmente a carico
              </dt>
              <dd className="text-foreground text-sm">
                {collab.sono_un_figlio_a_carico ? 'Sì' : 'No'}
              </dd>
            </div>
          )}
          {!isResponsabileProfile && collab.importo_lordo_massimale != null && (
            <div>
              <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                Massimale lordo annuo
              </dt>
              <dd className="text-foreground text-sm">
                {collab.importo_lordo_massimale.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </dd>
            </div>
          )}
        </dl>
      </div>

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
                <TableRow key={doc.id} className="hover:bg-muted/30">
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
                <label className="block text-[11px] text-muted-foreground mb-1">Nome</label>
                <Input value={fNome} onChange={(e) => setFNome(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Cognome</label>
                <Input value={fCognome} onChange={(e) => setFCognome(e.target.value)} />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Username</label>
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
              <label className="block text-[11px] text-muted-foreground mb-1">Telefono</label>
              <Input type="tel" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} />
            </div>

            {/* Collaboratore-only fields */}
            {!isResponsabileProfile && (
              <>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Codice fiscale</label>
                  <Input
                    value={fCF}
                    onChange={(e) => setFCF(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    maxLength={16}
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Data di nascita</label>
                    <Input type="date" value={fDataNascita} onChange={(e) => setFDataNascita(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Città di nascita</label>
                    <Input value={fLuogoNascita} onChange={(e) => setFLuogoNascita(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Provincia di nascita</label>
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
                <label className="block text-[11px] text-muted-foreground mb-1">Comune di residenza</label>
                <Input value={fComune} onChange={(e) => setFComune(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Provincia residenza</label>
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
                <label className="block text-[11px] text-muted-foreground mb-1">Indirizzo</label>
                <Input value={fIndirizzo} onChange={(e) => setFIndirizzo(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Civico</label>
                <Input value={fCivico} onChange={(e) => setFCivico(e.target.value)} maxLength={10} />
              </div>
            </div>

            {/* Collaboratore-only extra fields */}
            {!isResponsabileProfile && (
              <>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Taglia t-shirt</label>
                  <Select value={fTshirt || undefined} onValueChange={setFTshirt}>
                    <SelectTrigger>
                      <SelectValue placeholder="— Non specificata —" />
                    </SelectTrigger>
                    <SelectContent>
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => (
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
                  <label className="block text-[11px] text-muted-foreground mb-1">
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
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  Intestatario del conto bancario
                </label>
                <Input
                  placeholder="Mario Rossi"
                  value={fIntestatario}
                  onChange={(e) => setFIntestatario(e.target.value)}
                  maxLength={100}
                />
              </div>
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

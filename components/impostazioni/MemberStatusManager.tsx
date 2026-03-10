'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

type MemberStatus = 'attivo' | 'uscente_con_compenso' | 'uscente_senza_compenso';

type MemberRow = {
  id: string;
  user_id: string;
  nome: string;
  cognome: string;
  email: string;
  username: string | null;
  member_status: MemberStatus;
  is_active: boolean;
  data_ingresso: string | null;
};

type EditState = {
  member_status: MemberStatus;
  is_active: boolean;
  data_ingresso: string | null;
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  attivo: 'Attivo',
  uscente_con_compenso: 'Uscente (con compenso)',
  uscente_senza_compenso: 'Uscente (senza compenso)',
};

const STATUS_DOT: Record<MemberStatus, string> = {
  attivo: 'bg-green-500',
  uscente_con_compenso: 'bg-yellow-500',
  uscente_senza_compenso: 'bg-muted-foreground',
};

const DOWNGRADE_MESSAGES: Partial<Record<MemberStatus, string>> = {
  uscente_con_compenso:
    'Il collaboratore potrà visualizzare le richieste in corso ma non creare nuovi documenti o rimborsi.',
  uscente_senza_compenso:
    'Il collaboratore avrà accesso ai soli documenti storici. Non potrà creare rimborsi né visualizzare compensi attivi.',
};

const ORDER: Record<MemberStatus, number> = {
  attivo: 0,
  uscente_con_compenso: 1,
  uscente_senza_compenso: 2,
};

function isDowngrade(from: MemberStatus, to: MemberStatus) {
  return ORDER[to] > ORDER[from];
}

const LIMIT = 20;

export default function MemberStatusManager() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [pendingStatus, setPendingStatus] = useState<MemberStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMembers = useCallback(async (query: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, page: String(pg), limit: String(LIMIT) });
      const res = await fetch(`/api/admin/members?${params}`);
      if (!res.ok) throw new Error('Errore nel caricamento');
      const json = await res.json();
      setMembers(json.members ?? []);
      setTotal(json.total ?? 0);
    } catch {
      toast.error('Errore nel caricamento dei collaboratori');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMembers(q, 1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchMembers]);

  // Page change — immediate fetch
  useEffect(() => {
    fetchMembers(q, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openModal(member: MemberRow) {
    setSelected(member);
    setEditState({
      member_status: member.member_status,
      is_active: member.is_active,
      data_ingresso: member.data_ingresso,
    });
  }

  function closeModal() {
    setSelected(null);
    setEditState(null);
    setPendingStatus(null);
  }

  function handleStatusChange(newStatus: MemberStatus) {
    if (!editState) return;
    if (isDowngrade(editState.member_status, newStatus)) {
      setPendingStatus(newStatus);
    } else {
      setEditState((prev) => prev ? { ...prev, member_status: newStatus } : prev);
    }
  }

  function confirmDowngrade() {
    if (!pendingStatus) return;
    setEditState((prev) => prev ? { ...prev, member_status: pendingStatus } : prev);
    setPendingStatus(null);
  }

  async function handleSave() {
    if (!selected || !editState) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editState),
      });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error ?? 'Errore durante il salvataggio', { duration: 5000 });
        return;
      }
      toast.success('Collaboratore aggiornato');
      closeModal();
      fetchMembers(q, page);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  return (
    <>
      <div className="rounded-2xl bg-card border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Stato collaboratori</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestisci lo stato di uscita e la data di ingresso dei collaboratori.
          </p>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border">
          <Input
            placeholder="Cerca per nome, cognome, email o username…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="px-5 py-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-8">
            <EmptyState icon={Users} title="Nessun collaboratore trovato" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Nome</th>
                  <th className="px-5 py-2.5 text-left font-medium">Email</th>
                  <th className="px-5 py-2.5 text-left font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-muted/60 transition cursor-pointer"
                    onClick={() => openModal(m)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[m.member_status]}`} />
                        <span className="text-foreground truncate max-w-[180px]">{m.cognome} {m.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground truncate max-w-[200px]">{m.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{STATUS_LABELS[m.member_status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Mostrando {showingFrom}–{showingTo} di {total} collaboratori
            </p>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      aria-label="Pagina precedente"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-disabled={page === 1}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-xs text-muted-foreground px-2">
                      {page} / {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      aria-label="Pagina successiva"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-disabled={page === totalPages}
                      className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="pr-10">
            <DialogTitle>
              {selected?.cognome} {selected?.nome}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{selected?.email}</p>
          </DialogHeader>

          {editState && (
            <div className="space-y-4">
              <Separator />

              {/* Account active toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Account {editState.is_active ? 'attivo' : 'disattivato'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editState.is_active
                      ? 'Il collaboratore può accedere al portale.'
                      : 'Il collaboratore non può accedere al portale.'}
                  </p>
                </div>
                <Switch
                  checked={editState.is_active}
                  onCheckedChange={(v) => setEditState((prev) => prev ? { ...prev, is_active: v } : prev)}
                />
              </div>

              <Separator />

              {/* Member status */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Stato collaborazione</p>
                <Select
                  value={editState.member_status}
                  onValueChange={(v) => handleStatusChange(v as MemberStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [MemberStatus, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Data ingresso */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Data ingresso</p>
                <Input
                  type="date"
                  value={editState.data_ingresso ?? ''}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, data_ingresso: e.target.value || null } : prev
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Annulla
            </Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade confirmation AlertDialog */}
      <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => { if (!open) setPendingStatus(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cambio stato</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus ? DOWNGRADE_MESSAGES[pendingStatus] : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

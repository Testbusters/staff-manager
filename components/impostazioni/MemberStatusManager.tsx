'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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

// Only used in the modal dropdown — 'attivo' is the neutral/clear state, not an explicit choice
const EXIT_MODE_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'uscente_con_compenso', label: 'Uscente (con compenso)' },
  { value: 'uscente_senza_compenso', label: 'Uscente (senza compenso)' },
];

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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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
  // Prevents double-fetch: page effect must skip when q-debounce already triggered a page reset
  const suppressPageEffect = useRef(false);
  // Skips the initial synchronous page effect run (initial load handled by q effect)
  const isMounted = useRef(false);

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

  // Debounced search — also handles initial load (fires once on mount after 300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // If currently past page 1, the setPage(1) below will trigger the page effect;
      // suppress it to avoid a duplicate fetch.
      if (page !== 1) suppressPageEffect.current = true;
      setPage(1);
      fetchMembers(q, 1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fetchMembers]);

  // Pagination — fires only on genuine user-driven page changes
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (suppressPageEffect.current) { suppressPageEffect.current = false; return; }
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
          <div className="px-5 py-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[180px_220px_100px_110px_180px] gap-4 items-center">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-8">
            <EmptyState icon={Users} title="Nessun collaboratore trovato" />
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium w-[180px]">Nome</th>
                  <th className="px-5 py-2.5 text-left font-medium w-[220px] hidden sm:table-cell">Email</th>
                  <th className="px-5 py-2.5 text-left font-medium w-[100px]">Accesso</th>
                  <th className="px-5 py-2.5 text-left font-medium w-[110px]">Data ingresso</th>
                  <th className="px-5 py-2.5 text-left font-medium w-[180px] hidden sm:table-cell">Modalità uscita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-muted/60 transition cursor-pointer"
                    onClick={() => openModal(m)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openModal(m); }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="px-5 py-3">
                      <span className="text-foreground block truncate">{m.cognome} {m.nome}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{m.email}</td>
                    <td className="px-5 py-3">
                      {m.is_active ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Attivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Disattivato
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      {formatDate(m.data_ingresso)}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {m.member_status === 'uscente_con_compenso' && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Uscente (con compenso)
                        </span>
                      )}
                      {m.member_status === 'uscente_senza_compenso' && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                          Uscente (senza compenso)
                        </span>
                      )}
                    </td>
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
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected?.cognome} {selected?.nome}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{selected?.email}</p>
          </DialogHeader>

          {editState && (
            <div className="space-y-5">
              <Separator />

              {/* Account active toggle */}
              <div className="flex items-center justify-between gap-4">
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

              {/* Exit mode */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Modalità uscita</p>
                <p className="text-xs text-muted-foreground -mt-1">
                  Lascia vuoto se il collaboratore è ancora attivo.
                </p>
                <Select
                  value={editState.member_status}
                  onValueChange={(v) => handleStatusChange(v as MemberStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attivo">Nessuna uscita programmata</SelectItem>
                    {EXIT_MODE_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Data ingresso */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Data ingresso</p>
                <DatePicker
                  value={editState.data_ingresso ?? ''}
                  onChange={(v) =>
                    setEditState((prev) =>
                      prev ? { ...prev, data_ingresso: v || null } : prev
                    )
                  }
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
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDowngrade}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

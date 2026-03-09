'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MemberStatus = 'attivo' | 'uscente_con_compenso' | 'uscente_senza_compenso';

type Member = {
  id: string;
  user_id: string;
  nome: string;
  cognome: string;
  member_status: MemberStatus;
  is_active: boolean;
  data_ingresso: string | null;
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  attivo:                   'Attivo',
  uscente_con_compenso:     'Uscente (con compenso)',
  uscente_senza_compenso:   'Uscente (senza compenso)',
};

const STATUS_DOT: Record<MemberStatus, string> = {
  attivo:                   'bg-green-500',
  uscente_con_compenso:     'bg-yellow-500',
  uscente_senza_compenso:   'bg-muted-foreground',
};

export default function MemberStatusManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);
  const [loadingDateId, setLoadingDateId] = useState<string | null>(null);
  const [dateValues, setDateValues] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, m.data_ingresso ?? ''])),
  );
  const [dirtyDates, setDirtyDates] = useState<Set<string>>(new Set());

  async function handleStatusChange(id: string, newStatus: MemberStatus) {
    setLoadingStatusId(id);
    const res = await fetch(`/api/admin/members/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_status: newStatus }),
    });
    setLoadingStatusId(null);
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? 'Errore.', { duration: 5000 }); return; }
    router.refresh();
  }

  async function handleDateSave(id: string, originalDate: string | null) {
    const value = dateValues[id] || null;
    if (value === (originalDate ?? '')) {
      const next = new Set(dirtyDates);
      next.delete(id);
      setDirtyDates(next);
      return;
    }
    setLoadingDateId(id);
    const res = await fetch(`/api/admin/members/${id}/data-ingresso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_ingresso: value }),
    });
    setLoadingDateId(null);
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? 'Errore.', { duration: 5000 }); return; }
    const next = new Set(dirtyDates);
    next.delete(id);
    setDirtyDates(next);
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Stato collaboratori</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestisci lo stato di uscita e la data di ingresso dei collaboratori.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Nessun collaboratore trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-medium">Nome</th>
                <th className="px-5 py-2.5 text-left font-medium">Stato</th>
                <th className="px-5 py-2.5 text-left font-medium">Data ingresso</th>
                <th className="px-5 py-2.5 text-left font-medium w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/60 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[m.member_status]}`} />
                      <span className="text-foreground truncate max-w-[180px]">{m.cognome} {m.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Select
                      value={m.member_status}
                      onValueChange={(v) => handleStatusChange(m.id, v as MemberStatus)}
                      disabled={loadingStatusId === m.id}
                    >
                      <SelectTrigger className="h-8 text-sm w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_LABELS) as [MemberStatus, string][]).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-3">
                    <Input
                      type="date"
                      value={dateValues[m.id] ?? ''}
                      onChange={(e) => {
                        setDateValues((prev) => ({ ...prev, [m.id]: e.target.value }));
                        const next = new Set(dirtyDates);
                        next.add(m.id);
                        setDirtyDates(next);
                      }}
                      disabled={loadingDateId === m.id}
                      className="h-8 py-1 px-2 text-xs w-[140px]"
                    />
                  </td>
                  <td className="px-5 py-3">
                    {dirtyDates.has(m.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingDateId === m.id}
                        onClick={() => handleDateSave(m.id, m.data_ingresso)}
                      >
                        {loadingDateId === m.id ? '…' : 'Salva'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

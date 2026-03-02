import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PaymentOverview from '@/components/compensation/PaymentOverview';
import CompenseTabs from '@/components/compensation/CompenseTabs';
import TicketQuickModal from '@/components/ticket/TicketQuickModal';
import type { Role } from '@/lib/types';

type CompYearBreakdown = { year: number; netto: number; lordo: number };
type ExpYearBreakdown  = { year: number; total: number };

function groupCompByYear(rows: { stato: string; liquidated_at: string | null; importo_lordo?: number | null; importo_netto?: number | null }[]): {
  paidByYear: CompYearBreakdown[];
  approvedLordo: number;
  approvedNetto: number;
  inAttesaNetto: number;
} {
  const nettoMap: Record<number, number> = {};
  const lordoMap: Record<number, number> = {};
  let approvedLordo = 0, approvedNetto = 0, inAttesaNetto = 0;

  for (const row of rows) {
    if (row.stato === 'LIQUIDATO' && row.liquidated_at) {
      const y = new Date(row.liquidated_at).getFullYear();
      nettoMap[y] = (nettoMap[y] ?? 0) + (row.importo_netto ?? 0);
      lordoMap[y] = (lordoMap[y] ?? 0) + (row.importo_lordo ?? 0);
    } else if (row.stato === 'APPROVATO') {
      approvedLordo += row.importo_lordo ?? 0;
      approvedNetto += row.importo_netto ?? 0;
    } else if (row.stato === 'IN_ATTESA') {
      inAttesaNetto += row.importo_netto ?? 0;
    }
  }

  const paidByYear = Object.entries(nettoMap)
    .map(([y, netto]) => ({ year: Number(y), netto, lordo: lordoMap[Number(y)] ?? 0 }))
    .sort((a, b) => b.year - a.year);

  return { paidByYear, approvedLordo, approvedNetto, inAttesaNetto };
}

function groupExpByYear(rows: { stato: string; liquidated_at: string | null; importo?: number }[]): {
  paidByYear: ExpYearBreakdown[];
  approved: number;
  inAttesa: number;
} {
  const map: Record<number, number> = {};
  let approved = 0, inAttesa = 0;

  for (const row of rows) {
    if (row.stato === 'LIQUIDATO' && row.liquidated_at) {
      const y = new Date(row.liquidated_at).getFullYear();
      map[y] = (map[y] ?? 0) + (row.importo ?? 0);
    } else if (row.stato === 'APPROVATO') {
      approved += row.importo ?? 0;
    } else if (row.stato === 'IN_ATTESA') {
      inAttesa += row.importo ?? 0;
    }
  }

  const paidByYear = Object.entries(map)
    .map(([y, total]) => ({ year: Number(y), total }))
    .sort((a, b) => b.year - a.year);

  return { paidByYear, approved, inAttesa };
}

export default async function CompensiPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.role !== 'collaboratore') redirect('/');
  if (profile.member_status === 'uscente_senza_compenso') redirect('/profilo?tab=documenti');

  const currentYear = new Date().getFullYear();

  const [
    { data: compensations },
    { data: allCompens },
    { data: allExpenses },
    { data: expenses },
    { data: collabRecord },
  ] = await Promise.all([
    supabase
      .from('compensations')
      .select('*, communities(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('compensations')
      .select('stato, importo_lordo, importo_netto, liquidated_at'),
    supabase
      .from('expense_reimbursements')
      .select('importo, stato, liquidated_at'),
    supabase
      .from('expense_reimbursements')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('collaborators')
      .select('importo_lordo_massimale')
      .eq('user_id', user.id)
      .single(),
  ]);

  const {
    paidByYear: compensPaidByYear,
    approvedLordo: compensApprovedLordo,
    approvedNetto: compensApprovedNetto,
    inAttesaNetto: compensInAttesaNetto,
  } = groupCompByYear(allCompens ?? []);

  const {
    paidByYear: expensePaidByYear,
    approved: expenseApproved,
    inAttesa: expenseInAttesa,
  } = groupExpByYear(allExpenses ?? []);

  const massimale = collabRecord?.importo_lordo_massimale ?? null;

  // Lordo liquidato nell'anno corrente — usato per la barra massimale
  const paidCurrentYear = compensPaidByYear.find((y) => y.year === currentYear)?.lordo ?? 0;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Compensi e Rimborsi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Visualizza i tuoi compensi e rimborsi, e gestisci le richieste di supporto.
          </p>
        </div>
        <TicketQuickModal />
      </div>

      <PaymentOverview
        compensPaidByYear={compensPaidByYear}
        compensApprovedLordo={compensApprovedLordo}
        compensApprovedNetto={compensApprovedNetto}
        compensInAttesaNetto={compensInAttesaNetto}
        expensePaidByYear={expensePaidByYear}
        expenseApproved={expenseApproved}
        expenseInAttesa={expenseInAttesa}
        massimale={massimale}
        paidCurrentYear={paidCurrentYear}
        currentYear={currentYear}
      />

      <CompenseTabs
        compensations={compensations ?? []}
        expenses={expenses ?? []}
        role={profile.role as Role}
      />
    </div>
  );
}

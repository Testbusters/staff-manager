import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ApprovazioniCompensazioni from '@/components/compensation/ApprovazioniCompensazioni';
import ApprovazioniRimborsi from '@/components/expense/ApprovazioniRimborsi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default async function ApprovazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.role !== 'responsabile_compensi') redirect('/');

  const { tab } = await searchParams;
  const activeTab = tab === 'rimborsi' ? 'rimborsi' : 'compensi';

  // Fetch all states for the active tab, including collaborator name
  const compensations = activeTab === 'compensi'
    ? await supabase
        .from('compensations')
        .select('*, collaborators(nome, cognome)')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])
    : [];

  const expenses = activeTab === 'rimborsi'
    ? await supabase
        .from('expense_reimbursements')
        .select('*, collaborators(nome, cognome)')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])
    : [];

  // KPI aggregation — server-side
  const compKpi = {
    inAttesa: compensations.filter((c) => c.stato === 'IN_ATTESA').length,
    totaleLordoInAttesa: compensations
      .filter((c) => c.stato === 'IN_ATTESA')
      .reduce((s, c) => s + (c.importo_lordo ?? 0), 0),
    approvati: compensations.filter((c) => c.stato === 'APPROVATO').length,
    totaleLordoApprovati: compensations
      .filter((c) => c.stato === 'APPROVATO')
      .reduce((s, c) => s + (c.importo_lordo ?? 0), 0),
    liquidato: compensations.filter((c) => c.stato === 'LIQUIDATO').length,
    totaleLordoLiquidato: compensations
      .filter((c) => c.stato === 'LIQUIDATO')
      .reduce((s, c) => s + (c.importo_lordo ?? 0), 0),
  };

  const expKpi = {
    inAttesa: expenses.filter((e) => e.stato === 'IN_ATTESA').length,
    totaleInAttesa: expenses
      .filter((e) => e.stato === 'IN_ATTESA')
      .reduce((s, e) => s + (e.importo ?? 0), 0),
    approvati: expenses.filter((e) => e.stato === 'APPROVATO').length,
    totaleApprovati: expenses
      .filter((e) => e.stato === 'APPROVATO')
      .reduce((s, e) => s + (e.importo ?? 0), 0),
    liquidato: expenses.filter((e) => e.stato === 'LIQUIDATO').length,
    totaleLiquidato: expenses
      .filter((e) => e.stato === 'LIQUIDATO')
      .reduce((s, e) => s + (e.importo ?? 0), 0),
  };

  const tabCls = (t: string) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Compensi e rimborsi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestione compensi e rimborsi nelle community a te assegnate.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Link href="?tab=compensi" className={tabCls('compensi')}>Compensi</Link>
        <Link href="?tab=rimborsi" className={tabCls('rimborsi')}>Rimborsi</Link>
      </div>

      {activeTab === 'compensi' && (
        <ApprovazioniCompensazioni compensations={compensations} kpi={compKpi} />
      )}
      {activeTab === 'rimborsi' && (
        <>
          <Alert className="mb-4 border-border bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-sm text-muted-foreground">
              Visualizzazione in sola lettura. Le azioni di approvazione e liquidazione sono riservate all&apos;amministrazione.
            </AlertDescription>
          </Alert>
          <ApprovazioniRimborsi expenses={expenses} kpi={expKpi} />
        </>
      )}
    </div>
  );
}

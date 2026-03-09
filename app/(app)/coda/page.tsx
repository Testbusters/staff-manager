import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import CodaCompensazioni from '@/components/admin/CodaCompensazioni';
import CodaRimborsi from '@/components/admin/CodaRimborsi';
import CodaReceiptButton from '@/components/admin/CodaReceiptButton';

export default async function CodaPage({
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
  if (profile.role !== 'amministrazione') redirect('/');

  const { tab } = await searchParams;
  const activeTab = tab === 'rimborsi' ? 'rimborsi' : 'compensi';

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [compsRes, expsRes, receiptTemplateRes] = await Promise.all([
    svc
      .from('compensations')
      .select('id, collaborator_id, importo_lordo, importo_netto, data_competenza, nome_servizio_ruolo, stato, rejection_note, created_at')
      .in('stato', ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'])
      .order('created_at', { ascending: true }),
    svc
      .from('expense_reimbursements')
      .select('id, collaborator_id, importo, categoria, data_spesa, stato, rejection_note, created_at')
      .in('stato', ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'])
      .order('created_at', { ascending: true }),
    svc
      .from('contract_templates')
      .select('tipo')
      .eq('tipo', 'RICEVUTA_PAGAMENTO')
      .maybeSingle(),
  ]);

  const hasReceiptTemplate = !!receiptTemplateRes.data;

  // Two-step collaborator join (no PostgREST embedded join)
  const allCollabIds = [
    ...new Set([
      ...(compsRes.data ?? []).map((r) => r.collaborator_id),
      ...(expsRes.data ?? []).map((r) => r.collaborator_id),
    ]),
  ].filter(Boolean);

  const collabsRes = await svc
    .from('collaborators')
    .select('id, nome, cognome, importo_lordo_massimale')
    .in('id', allCollabIds);

  const collabMap = new Map(
    (collabsRes.data ?? []).map((c) => [c.id, c]),
  );

  const compensations = (compsRes.data ?? []).map((r) => ({
    ...r,
    collabName: collabMap.has(r.collaborator_id)
      ? `${collabMap.get(r.collaborator_id)!.nome} ${collabMap.get(r.collaborator_id)!.cognome}`
      : r.collaborator_id,
    massimale: collabMap.get(r.collaborator_id)?.importo_lordo_massimale ?? null,
  }));

  const expenses = (expsRes.data ?? []).map((r) => ({
    ...r,
    collabName: collabMap.has(r.collaborator_id)
      ? `${collabMap.get(r.collaborator_id)!.nome} ${collabMap.get(r.collaborator_id)!.cognome}`
      : r.collaborator_id,
    massimale: collabMap.get(r.collaborator_id)?.importo_lordo_massimale ?? null,
  }));

  const tabCls = (t: string) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-muted/60'
    }`;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Coda lavoro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestione compensi e rimborsi — approvazione, rifiuto e liquidazione.
          </p>
        </div>
        <CodaReceiptButton />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <Link href="?tab=compensi" className={tabCls('compensi')}>
          Compensi
          {compensations.length > 0 && (
            <span className="ml-1.5 opacity-70">({compensations.length})</span>
          )}
        </Link>
        <Link href="?tab=rimborsi" className={tabCls('rimborsi')}>
          Rimborsi
          {expenses.length > 0 && (
            <span className="ml-1.5 opacity-70">({expenses.length})</span>
          )}
        </Link>
      </div>

      {activeTab === 'compensi' && (
        <CodaCompensazioni compensations={compensations} hasReceiptTemplate={hasReceiptTemplate} />
      )}
      {activeTab === 'rimborsi' && (
        <CodaRimborsi expenses={expenses} hasReceiptTemplate={hasReceiptTemplate} />
      )}
    </div>
  );
}

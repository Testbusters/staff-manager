import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/types';
import { MS_PER_DAY } from '@/lib/constants';
import AdminDashboard from '@/components/admin/AdminDashboard';
import type { AdminDashboardData } from '@/components/admin/types';
import { sumPaidComps } from './shared';

export default async function AdminDashboardPage({ userId }: { userId: string }) {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const stalledThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [
    adminCollabRes,
    compsInAttesaRes,
    expsInAttesaRes,
    compsApprovatoRes,
    expsLiquidatoYtdRes,
    expsApprovatoRes,
    docsToSignRes,
    activeCollabsRes,
    communitiesRes,
    collabsByStatusRes,
    collabsByContractRes,
    paidCompsThisMonthRes,
    paidCompsLastMonthRes,
    paidCompsYtdRes,
    approvedThisMonthRes,
    approvedLastMonthRes,
    approvedYtdRes,
    newCollabsThisMonthRes,
    newCollabsLastMonthRes,
    newCollabsYtdRes,
    stalledCompsRes,
    stalledExpsRes,
    feedCompsRes,
    feedExpsRes,
    mustChangePwdRes,
    onboardingIncompleteRes,
  ] = await Promise.all([
    svc.from('collaborators')
      .select('nome, cognome, foto_profilo_url, data_ingresso')
      .eq('user_id', userId)
      .maybeSingle(),
    svc.from('compensations').select('importo_netto')
      .eq('stato', 'IN_ATTESA'),
    svc.from('expense_reimbursements').select('importo')
      .eq('stato', 'IN_ATTESA'),
    svc.from('compensations').select('importo_netto')
      .eq('stato', 'APPROVATO'),
    svc.from('expense_reimbursements').select('importo')
      .eq('stato', 'LIQUIDATO').gte('updated_at', startOfYear),
    svc.from('expense_reimbursements').select('importo')
      .eq('stato', 'APPROVATO'),
    svc.from('documents').select('id', { count: 'exact', head: true })
      .eq('stato_firma', 'DA_FIRMARE'),
    svc.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('is_active', true).neq('role', 'amministrazione'),
    svc.from('communities').select('id, name').eq('is_active', true).order('name'),
    svc.from('collaborators').select('member_status'),
    svc.from('collaborators').select('tipo_contratto'),
    svc.from('compensations').select('importo_netto')
      .eq('stato', 'LIQUIDATO').gte('updated_at', startOfMonth),
    svc.from('compensations').select('importo_netto')
      .eq('stato', 'LIQUIDATO').gte('updated_at', startOfLastMonth).lt('updated_at', startOfMonth),
    svc.from('compensations').select('importo_netto')
      .eq('stato', 'LIQUIDATO').gte('updated_at', startOfYear),
    svc.from('compensations').select('id', { count: 'exact', head: true })
      .in('stato', ['APPROVATO', 'LIQUIDATO']).gte('updated_at', startOfMonth),
    svc.from('compensations').select('id', { count: 'exact', head: true })
      .in('stato', ['APPROVATO', 'LIQUIDATO']).gte('updated_at', startOfLastMonth).lt('updated_at', startOfMonth),
    svc.from('compensations').select('id', { count: 'exact', head: true })
      .in('stato', ['APPROVATO', 'LIQUIDATO']).gte('updated_at', startOfYear),
    svc.from('collaborators').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth),
    svc.from('collaborators').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth).lt('created_at', startOfMonth),
    svc.from('collaborators').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfYear),
    svc.from('compensations')
      .select('id, stato, importo_netto, created_at, community_id, collaborator_id')
      .eq('stato', 'IN_ATTESA')
      .lt('created_at', stalledThreshold)
      .order('created_at', { ascending: true })
      .limit(20),
    svc.from('expense_reimbursements')
      .select('id, stato, importo, created_at, community_id, collaborator_id')
      .eq('stato', 'IN_ATTESA')
      .lt('created_at', stalledThreshold)
      .order('created_at', { ascending: true })
      .limit(20),
    svc.from('compensations')
      .select('id, stato, importo_netto, created_at, community_id, collaborator_id')
      .in('stato', ['IN_ATTESA', 'APPROVATO', 'LIQUIDATO', 'RIFIUTATO'])
      .order('created_at', { ascending: false })
      .limit(30),
    svc.from('expense_reimbursements')
      .select('id, stato, importo, created_at, community_id, collaborator_id')
      .in('stato', ['IN_ATTESA', 'APPROVATO', 'LIQUIDATO', 'RIFIUTATO'])
      .order('created_at', { ascending: false })
      .limit(30),
    svc.from('user_profiles')
      .select('user_id, must_change_password')
      .eq('must_change_password', true)
      .eq('is_active', true),
    svc.from('user_profiles')
      .select('user_id, onboarding_completed')
      .eq('onboarding_completed', false)
      .eq('is_active', true)
      .neq('role', 'amministrazione'),
  ]);

  // Community data
  const [communityCompsRes, communityExpsRes, communityDocsRes, communityCollabsRes] = await Promise.all([
    svc.from('compensations')
      .select('id, collaborator_id, importo_netto, data_competenza, stato, created_at')
      .in('stato', ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO'])
      .order('created_at', { ascending: false }),
    svc.from('expense_reimbursements')
      .select('id, collaborator_id, importo, stato, created_at')
      .in('stato', ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO'])
      .order('created_at', { ascending: false }),
    svc.from('documents')
      .select('id, collaborator_id, tipo, titolo, created_at')
      .eq('stato_firma', 'DA_FIRMARE')
      .order('created_at', { ascending: false }),
    svc.from('collaborator_communities')
      .select('collaborator_id, community_id'),
  ]);

  // Collabs + communities lookup for enrichment
  const allCollabIds = [
    ...(communityCompsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ...(communityExpsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ...(communityDocsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ...(stalledCompsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ...(stalledExpsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ...(feedCompsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ...(feedExpsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
  ];
  const uniqueCollabIds = [...new Set(allCollabIds)];

  const [collabsLookupRes, commLookupRes, blockCollabsRes] = await Promise.all([
    uniqueCollabIds.length > 0
      ? svc.from('collaborators').select('id, nome, cognome, email').in('id', uniqueCollabIds)
      : Promise.resolve({ data: [] as { id: string; nome: string | null; cognome: string | null; email: string | null }[] }),
    svc.from('communities').select('id, name'),
    svc.from('collaborators').select('id, user_id, nome, cognome, email'),
  ]);

  const collabMap = new Map<string, { nome: string; cognome: string; email: string }>(
    (collabsLookupRes.data ?? []).map(c => [
      c.id,
      { nome: c.nome ?? '', cognome: c.cognome ?? '', email: c.email ?? '' },
    ])
  );
  const commMap = new Map<string, string>(
    (commLookupRes.data ?? []).map(c => [c.id, c.name])
  );

  // KPIs
  const _compsInAttesa = compsInAttesaRes.data ?? [];
  const _expsInAttesa = expsInAttesaRes.data ?? [];
  const _compsApprovato = compsApprovatoRes.data ?? [];
  const _expsApprovato = expsApprovatoRes.data ?? [];
  const _compsLiqYtd = paidCompsYtdRes.data ?? [];
  const _expsLiqYtd = expsLiquidatoYtdRes.data ?? [];

  const kpis = {
    compsInAttesaCount: _compsInAttesa.length,
    compsInAttesaAmount: _compsInAttesa.reduce((s, c) => s + (c.importo_netto ?? 0), 0),
    expsInAttesaCount: _expsInAttesa.length,
    expsInAttesaAmount: _expsInAttesa.reduce((s, e) => s + (e.importo ?? 0), 0),
    compsApprovatoCount: _compsApprovato.length,
    compsApprovatoAmount: _compsApprovato.reduce((s, c) => s + (c.importo_netto ?? 0), 0),
    expsApprovatoCount: _expsApprovato.length,
    expsApprovatoAmount: _expsApprovato.reduce((s, e) => s + (e.importo ?? 0), 0),
    compsLiquidatoCount: _compsLiqYtd.length,
    compsLiquidatoAmount: _compsLiqYtd.reduce((s, c) => s + (c.importo_netto ?? 0), 0),
    expsLiquidatoCount: _expsLiqYtd.length,
    expsLiquidatoAmount: _expsLiqYtd.reduce((s, e) => s + (e.importo ?? 0), 0),
  };

  // Community collab map
  const communityCollabMap = new Map<string, Set<string>>();
  for (const row of (communityCollabsRes.data ?? []) as { collaborator_id: string; community_id: string }[]) {
    if (!communityCollabMap.has(row.community_id)) {
      communityCollabMap.set(row.community_id, new Set());
    }
    communityCollabMap.get(row.community_id)!.add(row.collaborator_id);
  }

  // Community cards
  const communityCards = (communitiesRes.data ?? []).map(comm => {
    const collabIds = communityCollabMap.get(comm.id) ?? new Set<string>();
    const compsForComm = (communityCompsRes.data ?? []).filter(
      (r: { collaborator_id: string }) => collabIds.has(r.collaborator_id)
    );
    const expsForComm = (communityExpsRes.data ?? []).filter(
      (r: { collaborator_id: string }) => collabIds.has(r.collaborator_id)
    );
    const docsForComm = (communityDocsRes.data ?? []).filter(
      (r: { collaborator_id: string }) => collabIds.has(r.collaborator_id)
    );
    const compsActive = compsForComm.filter(
      (r: { stato: string }) => r.stato === 'IN_ATTESA' || r.stato === 'APPROVATO'
    );
    const expsActive = expsForComm.filter(
      (r: { stato: string }) => r.stato === 'IN_ATTESA' || r.stato === 'APPROVATO'
    );
    return {
      id: comm.id,
      name: comm.name,
      compsActiveCount: compsActive.length,
      expsActiveCount: expsActive.length,
      docsToSignCount: docsForComm.length,
      comps: compsForComm.map((c: {
        id: string; collaborator_id: string; importo_netto: number | null;
        data_competenza: string | null; stato: string;
      }) => {
        const collab = collabMap.get(c.collaborator_id);
        return {
          id: c.id,
          collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
          importoNetto: c.importo_netto ?? 0,
          dataCompetenza: c.data_competenza,
          stato: c.stato,
          href: `/coda?tab=compensi&id=${c.id}`,
        };
      }),
      exps: expsForComm.map((e: {
        id: string; collaborator_id: string; importo: number | null;
        created_at: string; stato: string;
      }) => {
        const collab = collabMap.get(e.collaborator_id);
        return {
          id: e.id,
          collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
          importo: e.importo ?? 0,
          createdAt: e.created_at,
          stato: e.stato,
          href: `/coda?tab=rimborsi&id=${e.id}`,
        };
      }),
      docs: docsForComm.map((d: {
        id: string; collaborator_id: string; tipo: string | null;
        titolo: string | null; created_at: string;
      }) => {
        const collab = collabMap.get(d.collaborator_id);
        return {
          id: d.id,
          collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
          tipo: d.tipo ?? '',
          createdAt: d.created_at,
          href: `/documenti`,
        };
      }),
    };
  });

  // Period metrics
  const periodMetrics = {
    currentMonth: {
      paidAmount: sumPaidComps(paidCompsThisMonthRes.data ?? []),
      approvedCount: approvedThisMonthRes.count ?? 0,
      newCollabs: newCollabsThisMonthRes.count ?? 0,
    },
    lastMonth: {
      paidAmount: sumPaidComps(paidCompsLastMonthRes.data ?? []),
      approvedCount: approvedLastMonthRes.count ?? 0,
      newCollabs: newCollabsLastMonthRes.count ?? 0,
    },
    ytd: {
      paidAmount: sumPaidComps(paidCompsYtdRes.data ?? []),
      approvedCount: approvedYtdRes.count ?? 0,
      newCollabs: newCollabsYtdRes.count ?? 0,
    },
  };

  // Feed
  const feedItems = [
    ...(feedCompsRes.data ?? []).map((c: {
      id: string; stato: string; importo_netto: number | null;
      created_at: string; community_id: string; collaborator_id: string;
    }) => {
      const collab = collabMap.get(c.collaborator_id);
      return {
        key: `comp-${c.id}`,
        entityType: 'compensation' as const,
        entityId: c.id,
        collabId: c.collaborator_id,
        collabName: collab?.nome ?? '',
        collabCognome: collab?.cognome ?? '',
        communityId: c.community_id,
        communityName: commMap.get(c.community_id) ?? '',
        stato: c.stato,
        createdAt: c.created_at,
        amount: c.importo_netto ?? 0,
        href: `/coda?tab=compensi&id=${c.id}`,
      };
    }),
    ...(feedExpsRes.data ?? []).map((e: {
      id: string; stato: string; importo: number | null;
      created_at: string; community_id: string; collaborator_id: string;
    }) => {
      const collab = collabMap.get(e.collaborator_id);
      return {
        key: `exp-${e.id}`,
        entityType: 'expense' as const,
        entityId: e.id,
        collabId: e.collaborator_id,
        collabName: collab?.nome ?? '',
        collabCognome: collab?.cognome ?? '',
        communityId: e.community_id,
        communityName: commMap.get(e.community_id) ?? '',
        stato: e.stato,
        createdAt: e.created_at,
        amount: e.importo ?? 0,
        href: `/coda?tab=rimborsi&id=${e.id}`,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  // Block items
  const blockCollabMap = new Map<string, { id: string; nome: string; cognome: string; email: string }>(
    (blockCollabsRes.data ?? []).map((c: {
      id: string; user_id: string; nome: string | null; cognome: string | null; email: string | null;
    }) => [
      c.user_id,
      { id: c.id, nome: c.nome ?? '', cognome: c.cognome ?? '', email: c.email ?? '' },
    ])
  );

  const blockItems: AdminDashboardData['blockItems'] = [];

  for (const u of (mustChangePwdRes.data ?? []) as { user_id: string }[]) {
    const collab = blockCollabMap.get(u.user_id);
    blockItems.push({
      key: `pwd-${u.user_id}`,
      blockType: 'must_change_password',
      userId: u.user_id,
      collabId: collab?.id ?? '',
      collabName: collab ? `${collab.nome} ${collab.cognome}` : 'Utente',
      collabEmail: collab?.email ?? '',
      href: `/impostazioni`,
    });
  }

  for (const u of (onboardingIncompleteRes.data ?? []) as { user_id: string }[]) {
    const collab = blockCollabMap.get(u.user_id);
    blockItems.push({
      key: `onb-${u.user_id}`,
      blockType: 'onboarding_incomplete',
      userId: u.user_id,
      collabId: collab?.id ?? '',
      collabName: collab ? `${collab.nome} ${collab.cognome}` : 'Utente',
      collabEmail: collab?.email ?? '',
      href: `/impostazioni`,
    });
  }

  for (const c of (stalledCompsRes.data ?? []) as {
    id: string; stato: string; created_at: string; collaborator_id: string; community_id: string;
  }[]) {
    const collab = collabMap.get(c.collaborator_id);
    const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / MS_PER_DAY);
    blockItems.push({
      key: `stall-comp-${c.id}`,
      blockType: 'stalled_comp',
      userId: '',
      collabId: c.collaborator_id,
      collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
      collabEmail: collab?.email ?? '',
      entityId: c.id,
      href: `/coda?tab=compensi`,
      daysWaiting: days,
    });
  }

  for (const e of (stalledExpsRes.data ?? []) as {
    id: string; stato: string; created_at: string; collaborator_id: string; community_id: string;
  }[]) {
    const collab = collabMap.get(e.collaborator_id);
    const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / MS_PER_DAY);
    blockItems.push({
      key: `stall-exp-${e.id}`,
      blockType: 'stalled_exp',
      userId: '',
      collabId: e.collaborator_id,
      collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
      collabEmail: collab?.email ?? '',
      entityId: e.id,
      href: `/coda?tab=rimborsi`,
      daysWaiting: days,
    });
  }

  // Corsi KPI (admin global view)
  const [corsiAllRes, candidatureInAttesaRes] = await Promise.all([
    svc.from('corsi').select('id, data_inizio, data_fine'),
    svc.from('candidature').select('id').eq('stato', 'in_attesa'),
  ]);
  const todayAdmin = new Date().toISOString().slice(0, 10);
  const allCorsi = (corsiAllRes.data ?? []) as { id: string; data_inizio: string; data_fine: string }[];
  const corsiKpi = {
    corsiTotali: allCorsi.length,
    corsiAttivi: allCorsi.filter((c) => c.data_inizio <= todayAdmin && c.data_fine >= todayAdmin).length,
    candidatureInAttesa: (candidatureInAttesaRes.data ?? []).length,
  };

  const dashData: AdminDashboardData = {
    kpis,
    communityCards,
    periodMetrics,
    feedItems,
    blockItems,
    corsiKpi,
    hero: {
      nome: adminCollabRes.data?.nome ?? null,
      cognome: adminCollabRes.data?.cognome ?? null,
      foto_profilo_url: adminCollabRes.data?.foto_profilo_url ?? null,
      data_ingresso: adminCollabRes.data?.data_ingresso ?? null,
      roleLabel: ROLE_LABELS['amministrazione'],
    },
  };

  return <AdminDashboard data={dashData} />;
}

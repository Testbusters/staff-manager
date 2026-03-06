export type AdminKPIs = {
  compsInAttesaCount: number;
  compsInAttesaAmount: number;
  expsInAttesaCount: number;
  expsInAttesaAmount: number;
  compsApprovatoCount: number;
  compsApprovatoAmount: number;
  expsApprovatoCount: number;
  expsApprovatoAmount: number;
  compsLiquidatoCount: number;
  compsLiquidatoAmount: number;
  expsLiquidatoCount: number;
  expsLiquidatoAmount: number;
};

export type AdminCommunityCompRecord = {
  id: string;
  collabName: string;
  importoNetto: number;
  dataCompetenza: string | null;
  stato: string;
  href: string;
};

export type AdminCommunityExpRecord = {
  id: string;
  collabName: string;
  importo: number;
  createdAt: string;
  stato: string;
  href: string;
};

export type AdminCommunityDocRecord = {
  id: string;
  collabName: string;
  tipo: string;
  createdAt: string;
  href: string;
};

export type AdminCommunityCard = {
  id: string;
  name: string;
  compsActiveCount: number;
  expsActiveCount: number;
  docsToSignCount: number;
  comps: AdminCommunityCompRecord[];
  exps: AdminCommunityExpRecord[];
  docs: AdminCommunityDocRecord[];
};

export type AdminPeriodMetrics = {
  currentMonth: { paidAmount: number; approvedCount: number; newCollabs: number };
  lastMonth:    { paidAmount: number; approvedCount: number; newCollabs: number };
  ytd:          { paidAmount: number; approvedCount: number; newCollabs: number };
};

export type AdminFeedItem = {
  key: string;
  entityType: 'compensation' | 'expense' | 'document';
  entityId: string;
  collabId: string;
  collabName: string;
  collabCognome: string;
  communityId: string;
  communityName: string;
  stato: string;
  createdAt: string;
  amount: number;
  href: string;
};

export type AdminBlockItem = {
  key: string;
  blockType: 'must_change_password' | 'onboarding_incomplete' | 'stalled_comp' | 'stalled_exp';
  userId: string;
  collabId: string;
  collabName: string;
  collabEmail: string;
  entityId?: string;
  href: string;
  daysWaiting?: number;
};

export type AdminHero = {
  nome: string | null;
  cognome: string | null;
  foto_profilo_url: string | null;
  data_ingresso: string | null;
  roleLabel: string;
};

export type AdminDashboardData = {
  kpis: AdminKPIs;
  communityCards: AdminCommunityCard[];
  periodMetrics: AdminPeriodMetrics;
  feedItems: AdminFeedItem[];
  blockItems: AdminBlockItem[];
  hero: AdminHero;
};

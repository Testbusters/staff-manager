import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import CreateUserForm from '@/components/impostazioni/CreateUserForm';
import CommunityManager from '@/components/impostazioni/CommunityManager';
import MemberStatusManager from '@/components/impostazioni/MemberStatusManager';
import ContractTemplateManager from '@/components/impostazioni/ContractTemplateManager';
import NotificationSettingsManager from '@/components/impostazioni/NotificationSettingsManager';
import EmailTemplateManager from '@/components/impostazioni/EmailTemplateManager';
import MonitoraggioSection from '@/components/impostazioni/MonitoraggioSection';

type Tab = 'utenti' | 'community' | 'collaboratori' | 'contratti' | 'notifiche' | 'template_mail' | 'monitoraggio';

export default async function ImpostazioniPage({
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
  if (!['amministrazione'].includes(profile.role)) redirect('/');

  const { tab } = await searchParams;
  const activeTab: Tab = tab === 'community' ? 'community'
    : tab === 'collaboratori' ? 'collaboratori'
    : tab === 'contratti' ? 'contratti'
    : tab === 'notifiche' ? 'notifiche'
    : tab === 'template_mail' ? 'template_mail'
    : tab === 'monitoraggio' ? 'monitoraggio'
    : 'utenti';

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch email templates for the template_mail tab
  const emailTemplates = activeTab === 'template_mail'
    ? await serviceClient
        .from('email_templates')
        .select('*')
        .order('event_group')
        .order('key')
        .then((r) => r.data ?? [])
    : [];

  const emailLayoutConfig = activeTab === 'template_mail'
    ? await serviceClient
        .from('email_layout_config')
        .select('*')
        .limit(1)
        .single()
        .then((r) => r.data ?? null)
    : null;

  // Fetch notification settings for the notifiche tab
  const notificationSettings = activeTab === 'notifiche'
    ? await serviceClient
        .from('notification_settings')
        .select('id, event_key, recipient_role, label, inapp_enabled, email_enabled')
        .order('event_key')
        .then((r) => r.data ?? [])
    : [];

  // Fetch contract templates for the contratti tab
  const contractTemplates = activeTab === 'contratti'
    ? await serviceClient
        .from('contract_templates')
        .select('id, tipo, file_name, uploaded_at')
        .order('tipo')
        .then((r) => r.data ?? [])
    : [];

  // Fetch data for active tab
  const communities = activeTab === 'community' || activeTab === 'utenti'
    ? await serviceClient
        .from('communities')
        .select('id, name, is_active')
        .order('name')
        .then((r) => r.data ?? [])
    : [];

  const responsabili = activeTab === 'community'
    ? await (async () => {
        const { data: profiles } = await serviceClient
          .from('user_profiles')
          .select('user_id, can_publish_announcements')
          .eq('role', 'responsabile_compensi')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (!profiles || profiles.length === 0) return [];
        const userIds = profiles.map((p) => p.user_id);

        const [{ data: collabs }, { data: assignments }, { data: authData }] = await Promise.all([
          serviceClient.from('collaborators').select('user_id, nome, cognome').in('user_id', userIds),
          serviceClient.from('user_community_access').select('user_id, community_id, communities(id, name)').in('user_id', userIds),
          serviceClient.auth.admin.listUsers(),
        ]);

        const collabMap = Object.fromEntries((collabs ?? []).map((c) => [c.user_id, `${c.nome} ${c.cognome}`]));
        const emailMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u.email ?? '']));
        const assignMap: Record<string, { id: string; name: string }[]> = {};
        for (const a of assignments ?? []) {
          if (!assignMap[a.user_id]) assignMap[a.user_id] = [];
          const comm = Array.isArray(a.communities) ? a.communities[0] : a.communities;
          if (comm) assignMap[a.user_id].push({ id: comm.id, name: comm.name });
        }

        return profiles.map((p) => ({
          user_id: p.user_id,
          display_name: collabMap[p.user_id] ?? emailMap[p.user_id] ?? p.user_id,
          email: emailMap[p.user_id] ?? '',
          communities: assignMap[p.user_id] ?? [],
          can_publish_announcements: p.can_publish_announcements ?? true,
        }));
      })()
    : [];

  const tabCls = (t: Tab) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  const narrowContent = activeTab !== 'template_mail' && activeTab !== 'monitoraggio';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Impostazioni</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crea utenti · gestisci community e responsabili · configura stato e data ingresso collaboratori · carica template contratti · imposta notifiche e template email.
        </p>
      </div>

      {/* Tab bar — always full width so all tabs are visible */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <Link href="?tab=utenti" className={tabCls('utenti')}>Utenti</Link>
        <Link href="?tab=community" className={tabCls('community')}>Community</Link>
        <Link href="?tab=collaboratori" className={tabCls('collaboratori')}>Collaboratori</Link>
        <Link href="?tab=contratti" className={tabCls('contratti')}>Modelli Documenti</Link>
        <Link href="?tab=notifiche" className={tabCls('notifiche')}>Notifiche</Link>
        <Link href="?tab=template_mail" className={tabCls('template_mail')}>Template mail</Link>
        <Link href="?tab=monitoraggio" className={tabCls('monitoraggio')}>Monitoraggio</Link>
      </div>

      {/* Content — narrow (max-w-3xl) for simple tabs, full-width for mail+monitoring */}
      <div className={narrowContent ? 'max-w-3xl' : undefined}>

      {activeTab === 'utenti' && (
        <div className="rounded-2xl bg-card border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Crea nuovo utente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Genera le credenziali di accesso per un nuovo collaboratore o responsabile.
            </p>
          </div>
          <div className="p-5">
            <CreateUserForm />
          </div>
        </div>
      )}

      {activeTab === 'community' && (
        <CommunityManager
          communities={communities as { id: string; name: string; is_active: boolean }[]}
          responsabili={responsabili}
        />
      )}

      {activeTab === 'collaboratori' && (
        <MemberStatusManager />
      )}

      {activeTab === 'contratti' && (
        <ContractTemplateManager
          templates={contractTemplates as { id: string; tipo: 'OCCASIONALE' | 'RICEVUTA_PAGAMENTO'; file_name: string; uploaded_at: string }[]}
        />
      )}

      {activeTab === 'notifiche' && (
        <div className="rounded-2xl bg-card border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Impostazioni notifiche</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configura quali notifiche vengono inviate in-app e via email per ogni evento.
            </p>
          </div>
          <div className="p-5">
            <NotificationSettingsManager
              initialSettings={notificationSettings as {
                id: string;
                event_key: string;
                recipient_role: string;
                label: string;
                inapp_enabled: boolean;
                email_enabled: boolean;
              }[]}
            />
          </div>
        </div>
      )}

      {activeTab === 'monitoraggio' && (
        <MonitoraggioSection />
      )}

      {activeTab === 'template_mail' && emailLayoutConfig && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Template mail</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modifica il contenuto delle email transazionali e il layout comune.
            </p>
          </div>
          <EmailTemplateManager
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialTemplates={emailTemplates as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialLayout={emailLayoutConfig as any}
          />
        </div>
      )}
      </div>{/* end content width wrapper */}
    </div>
  );
}

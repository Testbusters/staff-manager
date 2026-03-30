import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';
import FeedbackButton from '@/components/FeedbackButton';
import NotificationBell from '@/components/NotificationBell';
import CommunityBanner from '@/components/banner/CommunityBanner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeSync } from '@/components/ThemeSync';
import { SessionGuard } from '@/components/SessionGuard';
import { Toaster } from '@/components/ui/sonner';
import { NAV_BY_ROLE } from '@/lib/nav';
import type { Role } from '@/lib/types';

const getSessionProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  return supabase
    .from('user_profiles')
    .select('role, is_active, member_status, theme_preference')
    .eq('user_id', userId)
    .single();
});

const getSessionCollaborator = cache(async (userId: string) => {
  const supabase = await createClient();
  return supabase
    .from('collaborators')
    .select('id, nome, cognome, foto_profilo_url')
    .eq('user_id', userId)
    .single();
});

export { getSessionProfile, getSessionCollaborator };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await getSessionProfile(user.id);

  if (!profile || !profile.is_active) redirect('/pending');

  const { data: collaborator } = await getSessionCollaborator(user.id);

  const role = profile.role as Role;
  const navItems = NAV_BY_ROLE[role];
  const userName = (collaborator?.nome && collaborator?.cognome)
    ? `${collaborator.nome} ${collaborator.cognome}`
    : user.email ?? 'Utente';

  const dbTheme = profile.theme_preference ?? 'dark';

  // Fetch community banner for collaboratori only
  type BannerData = { communityId: string; content: string; linkUrl: string | null; linkLabel: string | null; linkNewTab: boolean; updatedAt: string } | null;
  let bannerData: BannerData = null;
  if (role === 'collaboratore' && collaborator?.id) {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: cc } = await svc
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', collaborator.id)
      .maybeSingle();
    if (cc?.community_id) {
      const { data: comm } = await svc
        .from('communities')
        .select('banner_active, banner_content, banner_link_url, banner_link_label, banner_link_new_tab, banner_updated_at')
        .eq('id', cc.community_id)
        .single();
      if (comm?.banner_active && comm.banner_content) {
        bannerData = {
          communityId: cc.community_id,
          content: comm.banner_content,
          linkUrl: comm.banner_link_url ?? null,
          linkLabel: comm.banner_link_label ?? null,
          linkNewTab: comm.banner_link_new_tab ?? false,
          updatedAt: comm.banner_updated_at,
        };
      }
    }
  }

  return (
    <>
      <ThemeSync dbTheme={dbTheme} />
      <SessionGuard />
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <Sidebar
            navItems={navItems}
            userEmail={user.email ?? ''}
            userName={userName}
            avatarUrl={collaborator?.foto_profilo_url ?? null}
            role={role}
          />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {bannerData && (
              <CommunityBanner
                communityId={bannerData.communityId}
                content={bannerData.content}
                linkUrl={bannerData.linkUrl}
                linkLabel={bannerData.linkLabel}
                linkNewTab={bannerData.linkNewTab}
                updatedAt={bannerData.updatedAt}
              />
            )}
            {/* AppHeader — persistent across all viewports */}
            <header className="flex items-center h-12 px-4 border-b border-border flex-shrink-0">
              <span>
                <SidebarTrigger aria-label="Apri menu" />
              </span>
              <div className="flex-1" />
              <NotificationBell />
            </header>
            <TooltipProvider delayDuration={300}>
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </TooltipProvider>
          </div>
          <FeedbackButton />
        </div>
      </SidebarProvider>
      <Toaster position="bottom-right" richColors toastOptions={{ duration: 3000 }} />
    </>
  );
}

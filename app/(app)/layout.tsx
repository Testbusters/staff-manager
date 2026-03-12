import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import FeedbackButton from '@/components/FeedbackButton';
import NotificationBell from '@/components/NotificationBell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeSync } from '@/components/ThemeSync';
import { SessionGuard } from '@/components/SessionGuard';
import { Toaster } from '@/components/ui/sonner';
import { NAV_BY_ROLE } from '@/lib/nav';
import type { Role } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status, theme_preference')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.is_active) redirect('/pending');

  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('nome, cognome, foto_profilo_url')
    .eq('user_id', user.id)
    .single();

  const role = profile.role as Role;
  const navItems = NAV_BY_ROLE[role];
  const userName = (collaborator?.nome && collaborator?.cognome)
    ? `${collaborator.nome} ${collaborator.cognome}`
    : user.email ?? 'Utente';

  const dbTheme = profile.theme_preference ?? 'light';

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
            {/* AppHeader — persistent across all viewports */}
            <header className="flex items-center h-12 px-4 border-b border-border flex-shrink-0">
              <span className="md:hidden">
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

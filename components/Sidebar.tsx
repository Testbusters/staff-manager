'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Home, User, Wallet, GraduationCap, School, CalendarDays,
  Megaphone, Gift, Users, ShieldCheck,
  LayoutDashboard, Inbox, UsersRound, FileDown, Files,
  LifeBuoy, LayoutGrid, SlidersHorizontal, MessageSquarePlus,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import type { NavItem } from '@/lib/nav';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const ICON_MAP: Record<string, LucideIcon> = {
  Home, User, Wallet, GraduationCap, School, CalendarDays,
  Megaphone, Gift, Users,
  LayoutDashboard, Inbox, UsersRound, FileDown, Files,
  LifeBuoy, LayoutGrid, SlidersHorizontal, MessageSquarePlus,
};
import AppLogo from '@/components/ui/AppLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SidebarProps {
  navItems: NavItem[];
  userEmail: string;
  userName: string;
  avatarUrl?: string | null;
  role?: Role;
}

export default function Sidebar({ navItems, userEmail, userName, avatarUrl, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggleTheme = async () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await fetch('/api/profile/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <SidebarRoot collapsible="offcanvas" className="border-r border-sidebar-border w-64 flex-shrink-0">
      {/* Logo */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <AppLogo className="w-8 h-8 flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground flex-1">Staff Manager</span>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? Home;
            if (item.comingSoon) {
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    disabled
                    className="cursor-not-allowed opacity-60 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground select-none"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[9px] font-medium rounded-full bg-muted/60 px-1.5 py-0.5 text-muted-foreground/60 whitespace-nowrap shrink-0">
                      In arrivo
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-2">
          <Avatar className="w-7 h-7 shrink-0">
            {role !== 'amministrazione' && <AvatarImage src={avatarUrl ?? undefined} alt="" />}
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {role === 'amministrazione'
                ? <ShieldCheck className="h-3.5 w-3.5" />
                : <span className="text-xs">{userName.charAt(0).toUpperCase()}</span>
              }
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <div
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                     text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition mb-1 cursor-pointer"
          onClick={handleToggleTheme}
          suppressHydrationWarning
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggleTheme()}
        >
          <Switch
            checked={resolvedTheme === 'dark'}
            onCheckedChange={handleToggleTheme}
            suppressHydrationWarning
            aria-label="Toggle dark mode"
          />
          <span suppressHydrationWarning className="select-none">
            {resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-full text-left px-2 py-1.5 rounded-md text-xs text-sidebar-foreground
                         hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition"
            >
              Esci
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-semibold text-foreground">
                Esci dall&apos;account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Verrai reindirizzato alla pagina di login.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted border-border">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOut}
                variant="destructive"
                className="px-3 py-1.5 text-xs font-medium"
              >
                Esci
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </SidebarRoot>
  );
}

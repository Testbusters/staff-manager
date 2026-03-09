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

const ICON_MAP: Record<string, LucideIcon> = {
  Home, User, Wallet, GraduationCap, School, CalendarDays,
  Megaphone, Gift, Users,
  LayoutDashboard, Inbox, UsersRound, FileDown, Files,
  LifeBuoy, LayoutGrid, SlidersHorizontal, MessageSquarePlus,
};
import NotificationBell from '@/components/NotificationBell';
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
    <aside className="flex h-screen w-56 flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <AppLogo className="w-8 h-8 flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">Staff Manager</span>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.iconName] ?? Home;
          if (item.comingSoon) {
            return (
              <span
                key={item.label}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed select-none"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[9px] font-medium rounded-full bg-muted/60 px-1.5 py-0.5 text-muted-foreground/60 whitespace-nowrap shrink-0">
                  In arrivo
                </span>
              </span>
            );
          }
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
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
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 text-white border-0"
              >
                Esci
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
}

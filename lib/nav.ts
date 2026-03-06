import type { Role } from './types';
import type { LucideIcon } from 'lucide-react';
import {
  Home, User, Wallet, GraduationCap, School, CalendarDays,
  Megaphone, Gift, Zap, Users, BarChart3, FileText,
  Ticket, ClipboardList, Settings, MessageSquare,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  collaboratore: [
    { label: 'Home',                    href: '/',              icon: Home },
    { label: 'Profilo e Documenti',     href: '/profilo',       icon: User },
    { label: 'Compensi e Rimborsi',     href: '/compensi',      icon: Wallet },
    { label: 'Corsi',                   href: '#',              icon: GraduationCap, comingSoon: true },
    { label: 'Schoolbusters',           href: '#',              icon: School, comingSoon: true },
    { label: 'Eventi',                  href: '/eventi',        icon: CalendarDays },
    { label: 'Comunicazioni e Risorse', href: '/comunicazioni', icon: Megaphone },
    { label: 'Opportunità e Sconti',    href: '/opportunita',   icon: Gift },
  ],

  responsabile_compensi: [
    { label: 'Dashboard',    href: '/',             icon: Home },
    { label: 'Compensi e rimborsi', href: '/approvazioni', icon: Wallet },
    { label: 'Ticket',       href: '/ticket',       icon: Ticket },
  ],

  responsabile_cittadino: [],

  responsabile_servizi_individuali: [],

  amministrazione: [
    { label: 'Dashboard',    href: '/',              icon: Home },
    { label: 'Coda lavoro',  href: '/coda',         icon: Zap },
    { label: 'Collaboratori',href: '/collaboratori', icon: Users },
    { label: 'Export',       href: '/export',        icon: BarChart3 },
    { label: 'Documenti',    href: '/documenti',     icon: FileText },
    { label: 'Ticket',       href: '/ticket',        icon: Ticket },
    { label: 'Contenuti',    href: '/contenuti',     icon: ClipboardList },
    { label: 'Impostazioni', href: '/impostazioni',  icon: Settings },
    { label: 'Feedback',     href: '/feedback',      icon: MessageSquare },
  ],

};

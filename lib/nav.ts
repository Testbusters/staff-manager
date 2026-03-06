import type { Role } from './types';

export interface NavItem {
  label: string;
  href: string;
  iconName: string;
  comingSoon?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  collaboratore: [
    { label: 'Home',                    href: '/',              iconName: 'Home' },
    { label: 'Profilo e Documenti',     href: '/profilo',       iconName: 'User' },
    { label: 'Compensi e Rimborsi',     href: '/compensi',      iconName: 'Wallet' },
    { label: 'Corsi',                   href: '#',              iconName: 'GraduationCap', comingSoon: true },
    { label: 'Schoolbusters',           href: '#',              iconName: 'School', comingSoon: true },
    { label: 'Eventi',                  href: '/eventi',        iconName: 'CalendarDays' },
    { label: 'Comunicazioni e Risorse', href: '/comunicazioni', iconName: 'Megaphone' },
    { label: 'Opportunità e Sconti',    href: '/opportunita',   iconName: 'Gift' },
  ],

  responsabile_compensi: [
    { label: 'Dashboard',           href: '/',             iconName: 'Home' },
    { label: 'Compensi e rimborsi', href: '/approvazioni', iconName: 'Wallet' },
    { label: 'Ticket',              href: '/ticket',       iconName: 'Ticket' },
  ],

  responsabile_cittadino: [],

  responsabile_servizi_individuali: [],

  amministrazione: [
    { label: 'Dashboard',     href: '/',              iconName: 'Home' },
    { label: 'Coda lavoro',   href: '/coda',          iconName: 'Zap' },
    { label: 'Collaboratori', href: '/collaboratori', iconName: 'Users' },
    { label: 'Export',        href: '/export',        iconName: 'BarChart3' },
    { label: 'Documenti',     href: '/documenti',     iconName: 'FileText' },
    { label: 'Ticket',        href: '/ticket',        iconName: 'Ticket' },
    { label: 'Contenuti',     href: '/contenuti',     iconName: 'ClipboardList' },
    { label: 'Impostazioni',  href: '/impostazioni',  iconName: 'Settings' },
    { label: 'Feedback',      href: '/feedback',      iconName: 'MessageSquare' },
  ],

};

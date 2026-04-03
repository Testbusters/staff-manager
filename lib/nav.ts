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
    { label: 'Ticket',                  href: '/ticket',        iconName: 'LifeBuoy' },
    { label: 'Corsi',                   href: '/corsi',         iconName: 'GraduationCap' },
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

  responsabile_cittadino: [
    { label: 'Home',                       href: '/',                   iconName: 'Home' },
    { label: 'Candidatura e Assegnazione', href: '/corsi/assegnazione', iconName: 'GraduationCap' },
    { label: 'Valutazione Corsi',          href: '/corsi/valutazioni',  iconName: 'Star' },
    { label: 'Lista nera',                 href: '/lista-nera',         iconName: 'Ban' },
    { label: 'Creazione Eventi',           href: '/corsi/eventi-citta', iconName: 'CalendarDays' },
  ],

  responsabile_servizi_individuali: [],

  amministrazione: [
    { label: 'Dashboard',     href: '/',              iconName: 'LayoutDashboard' },
    { label: 'Coda lavoro',   href: '/coda',          iconName: 'Inbox' },
    { label: 'Collaboratori', href: '/collaboratori', iconName: 'UsersRound' },
    { label: 'Export',        href: '/export',        iconName: 'FileDown' },
    { label: 'Import',        href: '/import',        iconName: 'FileUp' },
    { label: 'Documenti',     href: '/documenti',     iconName: 'Files' },
    { label: 'Ticket',        href: '/ticket',        iconName: 'LifeBuoy' },
    { label: 'Contenuti',     href: '/contenuti',     iconName: 'LayoutGrid' },
    { label: 'Corsi',         href: '/corsi',         iconName: 'GraduationCap' },
    { label: 'Impostazioni',  href: '/impostazioni',  iconName: 'SlidersHorizontal' },
    { label: 'Feedback',      href: '/feedback',      iconName: 'MessageSquarePlus' },
  ],

};

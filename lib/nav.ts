import type { Role } from './types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  collaboratore: [
    { label: 'Home',                    href: '/',              icon: '🏠' },
    { label: 'Profilo e Documenti',     href: '/profilo',       icon: '👤' },
    { label: 'Compensi e Rimborsi',     href: '/compensi',      icon: '💶' },
    { label: 'Corsi',                   href: '#',              icon: '🎓', comingSoon: true },
    { label: 'Schoolbusters',           href: '#',              icon: '🏫', comingSoon: true },
    { label: 'Eventi',                  href: '/eventi',        icon: '🗓' },
    { label: 'Comunicazioni e Risorse', href: '/comunicazioni', icon: '📢' },
    { label: 'Opportunità e Sconti',    href: '/opportunita',   icon: '🎁' },
  ],

  responsabile_compensi: [
    { label: 'Profilo',      href: '/profilo',      icon: '👤' },
    { label: 'Compensi e rimborsi', href: '/approvazioni', icon: '💶' },
    { label: 'Collaboratori',href: '/collaboratori',icon: '👥' },
    { label: 'Documenti',    href: '/documenti',    icon: '📄' },
    { label: 'Ticket',       href: '/ticket',       icon: '🎫' },
  ],

  responsabile_cittadino: [],

  responsabile_servizi_individuali: [],

  amministrazione: [
    { label: 'Dashboard',    href: '/',              icon: '🏠' },
    { label: 'Coda lavoro',  href: '/coda',         icon: '⚡' },
    { label: 'Collaboratori',href: '/collaboratori', icon: '👥' },
    { label: 'Export',       href: '/export',        icon: '📊' },
    { label: 'Documenti',    href: '/documenti',     icon: '📄' },
    { label: 'Ticket',       href: '/ticket',        icon: '🎫' },
    { label: 'Contenuti',    href: '/contenuti',     icon: '📋' },
    { label: 'Impostazioni', href: '/impostazioni',  icon: '⚙️' },
    { label: 'Feedback',     href: '/feedback',      icon: '💬' },
  ],

};

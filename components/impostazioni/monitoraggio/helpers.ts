export function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDuration(ms: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const ACCESS_EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  token_refreshed: 'Token refresh',
  user_recovery_requested: 'Reset password',
};

export const EMAIL_EVENT_LABELS: Record<string, string> = {
  ['email.delivered']: 'Consegnata',
  ['email.bounced']: 'Rimbalzata',
  ['email.opened']: 'Aperta',
  ['email.clicked']: 'Click',
  ['email.complained']: 'Spam',
};

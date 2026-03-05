import type { ReactNode } from 'react';

/**
 * Login layout — forces light mode for the entire login experience.
 * next-themes ThemeProvider is at root; the login page calls setTheme('light')
 * on mount to override any stored preference.
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

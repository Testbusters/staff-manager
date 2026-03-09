import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

/**
 * Login layout — forces dark mode for the entire login experience.
 * next-themes ThemeProvider is at root; the login page calls setTheme('dark')
 * on mount to override any stored preference.
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </>
  );
}

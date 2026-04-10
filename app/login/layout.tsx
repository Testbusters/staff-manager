import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Accedi - Staff Manager',
  description: 'Accedi al portale interno Staff Manager.',
  robots: { index: false, follow: false },
};

/**
 * Login layout — forces dark mode for the entire login experience.
 * next-themes ThemeProvider is at root; the login page calls setTheme('dark')
 * on mount to override any stored preference.
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors toastOptions={{ duration: 3000 }} />
    </>
  );
}

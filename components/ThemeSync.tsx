'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

interface ThemeSyncProps {
  /** Theme value loaded from user_profiles.theme_preference */
  dbTheme: string;
}

/**
 * Syncs the DB theme preference into next-themes on mount.
 * Renders nothing — side-effect only.
 */
export function ThemeSync({ dbTheme }: ThemeSyncProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (dbTheme === 'light' || dbTheme === 'dark') {
      setTheme(dbTheme);
    }
  }, [dbTheme, setTheme]);

  return null;
}

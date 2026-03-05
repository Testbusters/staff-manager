'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface ThemeSyncProps {
  /** Theme value loaded from user_profiles.theme_preference */
  dbTheme: string;
}

/**
 * Applies the DB theme preference once on mount.
 * Using a ref to capture the initial value prevents re-running when next-themes
 * updates its internal setTheme reference after a user toggle — which was causing
 * the toggle to be immediately reverted back to the DB value.
 */
export function ThemeSync({ dbTheme }: ThemeSyncProps) {
  const { setTheme } = useTheme();
  const initialTheme = useRef(dbTheme);

  useEffect(() => {
    const t = initialTheme.current;
    if (t === 'light' || t === 'dark') {
      setTheme(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: DB theme sets initial state; user toggles persist via localStorage

  return null;
}

import { useState, useEffect, useCallback } from 'react';
import { authStorage, api } from '../services/api';

export function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    return authStorage.getActiveTheme();
  });

  const applyTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    authStorage.setActiveTheme(newTheme);

    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    api.updatePreferences({ theme: next }).catch(() => {});
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    applyTheme(newTheme);
    api.updatePreferences({ theme: newTheme }).catch(() => {});
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme, setTheme };
}

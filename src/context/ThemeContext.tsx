import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Light/dark theme for the admin app. The chosen theme is persisted in
 * localStorage ('pa_theme') and reflected as a `dark` class on <html> so both
 * Tailwind `dark:` variants and the dark CSS skin in index.css take effect.
 * index.html applies the saved value before first paint to avoid a flash.
 */
export type Theme = 'light' | 'dark';

const KEY = 'pa_theme';

function readInitial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return 'dark'; // dark is the default theme
}

function applyTheme(theme: Theme): void {
  const el = document.documentElement;
  if (theme === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => undefined,
  setTheme: () => undefined,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

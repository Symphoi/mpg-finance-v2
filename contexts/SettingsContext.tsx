'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface AppSettings {
  app_name:      string;
  app_subtitle:  string;
  logo_url:      string;
  login_bg_url:  string;
  primary_color: string;
  sidebar_color: string;
}

const DEFAULTS: AppSettings = {
  app_name:      'Finance',
  app_subtitle:  'v2.0 Management System',
  logo_url:      '',
  login_bg_url:  '',
  primary_color: '#7c3aed',
  sidebar_color: '#0f0a1e',
};

interface SettingsCtx {
  settings: AppSettings;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsCtx>({
  settings: DEFAULTS,
  reload: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

function applyCSSVars(s: AppSettings) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', s.primary_color || DEFAULTS.primary_color);
  root.style.setProperty('--color-sidebar', s.sidebar_color || DEFAULTS.sidebar_color);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/system-settings');
      const j   = await res.json();
      if (j.success) {
        const merged = { ...DEFAULTS, ...j.data };
        setSettings(merged);
        applyCSSVars(merged);
      }
    } catch {}
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <SettingsContext.Provider value={{ settings, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

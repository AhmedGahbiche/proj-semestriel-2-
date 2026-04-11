"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeMode = "dark" | "light";

type SettingsState = {
  fontScale: number;
  volume: number;
  brightness: number;
};

type ThemeSettingsContextType = {
  theme: ThemeMode;
  settings: SettingsState;
  toggleTheme: () => void;
  setFontScale: (value: number) => void;
  setVolume: (value: number) => void;
  setBrightness: (value: number) => void;
};

const STORAGE_KEY = "lumiere-theme-settings";

const defaultState: { theme: ThemeMode; settings: SettingsState } = {
  theme: "dark",
  settings: {
    fontScale: 100,
    volume: 50,
    brightness: 95,
  },
};

function getInitialState(): { theme: ThemeMode; settings: SettingsState } {
  if (typeof window === "undefined") {
    return defaultState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as typeof defaultState;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      settings: {
        fontScale: Math.min(120, Math.max(85, parsed.settings?.fontScale ?? 100)),
        volume: Math.min(100, Math.max(0, parsed.settings?.volume ?? 50)),
        brightness: Math.min(130, Math.max(70, parsed.settings?.brightness ?? 95)),
      },
    };
  } catch {
    return defaultState;
  }
}

const ThemeSettingsContext = createContext<ThemeSettingsContextType | null>(null);

export function ThemeSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialState().theme);
  const [settings, setSettings] = useState<SettingsState>(() => getInitialState().settings);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontScale}%`;
  }, [settings.fontScale]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, settings }));
  }, [theme, settings]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setFontScale = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, fontScale: value }));
  }, []);

  const setVolume = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, volume: value }));
  }, []);

  const setBrightness = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, brightness: value }));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      settings,
      toggleTheme,
      setFontScale,
      setVolume,
      setBrightness,
    }),
    [theme, settings, toggleTheme, setFontScale, setVolume, setBrightness],
  );

  return (
    <ThemeSettingsContext.Provider value={value}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "#000",
          opacity: Math.max(0, (100 - settings.brightness) / 180),
        }}
      />
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error("useThemeSettings must be used inside ThemeSettingsProvider");
  }
  return context;
}

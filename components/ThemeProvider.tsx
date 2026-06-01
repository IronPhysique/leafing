"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type AccentPreset,
  type BgMode,
  type ThemePrefs,
  STORAGE_KEYS,
  applyTheme,
  ACCENT_PRESETS,
  deriveHover,
  profileKey,
} from "@/lib/theme";

interface ThemeContextValue {
  prefs: ThemePrefs;
  setAccent: (preset: AccentPreset, custom?: string) => void;
  setBgMode: (mode: BgMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

const DEFAULT_PREFS: ThemePrefs = {
  accent: "emerald",
  accentCustom: "#34d399",
  bgMode: "dark-gray",
};

function readPrefs(): ThemePrefs {
  try {
    const accent = (localStorage.getItem(profileKey(STORAGE_KEYS.accent)) as AccentPreset | null) ?? "emerald";
    const accentCustom = localStorage.getItem(profileKey(STORAGE_KEYS.accentCustom)) ?? "#34d399";
    const bgMode = (localStorage.getItem(profileKey(STORAGE_KEYS.bgMode)) as BgMode | null) ?? "dark-gray";
    return {
      accent: [...Object.keys(ACCENT_PRESETS), "custom"].includes(accent) ? accent : "emerald",
      accentCustom: accentCustom.startsWith("#") ? accentCustom : "#34d399",
      bgMode: bgMode === "oled" ? "oled" : "dark-gray",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const saved = readPrefs();
    setPrefs(saved);
    applyTheme(saved);
  }, []);

  const setAccent = useCallback((preset: AccentPreset, custom?: string) => {
    setPrefs((prev) => {
      const next: ThemePrefs = {
        ...prev,
        accent: preset,
        accentCustom: preset === "custom" && custom ? custom : (custom ?? prev.accentCustom),
      };
      localStorage.setItem(profileKey(STORAGE_KEYS.accent), preset);
      if (custom) localStorage.setItem(profileKey(STORAGE_KEYS.accentCustom), custom);
      applyTheme({ accent: preset, accentCustom: next.accentCustom });
      return next;
    });
  }, []);

  const setBgMode = useCallback((mode: BgMode) => {
    setPrefs((prev) => {
      const next: ThemePrefs = { ...prev, bgMode: mode };
      localStorage.setItem(profileKey(STORAGE_KEYS.bgMode), mode);
      applyTheme({ bgMode: mode });
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ prefs, setAccent, setBgMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

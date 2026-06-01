export type AccentPreset =
  | "violet"
  | "sky"
  | "emerald"
  | "rose"
  | "amber"
  | "slate"
  | "custom";

export type BgMode = "dark-gray" | "oled";

export interface ThemePrefs {
  accent: AccentPreset;
  accentCustom: string;
  bgMode: BgMode;
}

export const ACCENT_PRESETS: Record<
  Exclude<AccentPreset, "custom">,
  { label: string; color: string; hover: string }
> = {
  violet: { label: "Violet",  color: "#7c83ff", hover: "#9197ff" },
  sky:    { label: "Sky",     color: "#38bdf8", hover: "#7dd3fc" },
  emerald:{ label: "Emerald", color: "#34d399", hover: "#6ee7b7" },
  rose:   { label: "Rose",    color: "#fb7185", hover: "#fda4af" },
  amber:  { label: "Amber",   color: "#fbbf24", hover: "#fcd34d" },
  slate:  { label: "Slate",   color: "#94a3b8", hover: "#cbd5e1" },
};

export const OLED_OVERRIDES = {
  "--bg":        "#000000",
  "--surface":   "#0d0d10",
  "--surface-2": "#141418",
  "--surface-3": "#1c1c22",
} as const;

export const DARK_GRAY_DEFAULTS = {
  "--bg":        "#131318",
  "--surface":   "#1b1b22",
  "--surface-2": "#24242d",
  "--surface-3": "#2e2e39",
} as const;

function getActiveProfileIdClient(): string {
  try {
    return document.documentElement.getAttribute("data-profile") ?? "";
  } catch {
    return "";
  }
}

export function profileKey(key: string, pid?: string): string {
  const id = pid ?? getActiveProfileIdClient();
  return id ? `${key}::${id}` : key;
}

export const STORAGE_KEYS = {
  accent:       "theme.accent",
  accentCustom: "theme.accentCustom",
  bgMode:       "theme.bgMode",
} as const;

export function deriveHover(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const clamp = (n: number) => Math.min(255, n + 30);
    return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}

export function applyTheme(prefs: Partial<ThemePrefs>) {
  const root = document.documentElement;

  if (prefs.bgMode) {
    const map = prefs.bgMode === "oled" ? OLED_OVERRIDES : DARK_GRAY_DEFAULTS;
    for (const [k, v] of Object.entries(map)) {
      root.style.setProperty(k, v);
    }
  }

  if (prefs.accent) {
    if (prefs.accent === "custom" && prefs.accentCustom) {
      root.style.setProperty("--accent", prefs.accentCustom);
      root.style.setProperty("--accent-hover", deriveHover(prefs.accentCustom));
    } else if (prefs.accent !== "custom") {
      const p = ACCENT_PRESETS[prefs.accent];
      if (p) {
        root.style.setProperty("--accent", p.color);
        root.style.setProperty("--accent-hover", p.hover);
      }
    }
  }
}

const _PRESETS_JSON = JSON.stringify(
  Object.fromEntries(
    Object.entries(ACCENT_PRESETS).map(([k, v]) => [k, [v.color, v.hover]]),
  ),
);
const _OLED_JSON = JSON.stringify(OLED_OVERRIDES);

export const THEME_INIT_SCRIPT = `
(function(){
  try {
    // Derive profileId from the <html data-profile> attribute (httpOnly cookie
    // isn't readable here) so prefs are per-profile.
    var pid = document.documentElement.getAttribute('data-profile') || '';
    function pk(key) { return pid ? key + '::' + pid : key; }

    var accent = localStorage.getItem(pk('${STORAGE_KEYS.accent}'));
    var accentCustom = localStorage.getItem(pk('${STORAGE_KEYS.accentCustom}'));
    var bgMode = localStorage.getItem(pk('${STORAGE_KEYS.bgMode}'));
    var root = document.documentElement;
    var PRESETS = ${_PRESETS_JSON};
    var OLED = ${_OLED_JSON};
    if (bgMode === 'oled') { for (var k in OLED) root.style.setProperty(k, OLED[k]); }
    if (accent === 'custom' && accentCustom) {
      root.style.setProperty('--accent', accentCustom);
      var r=parseInt(accentCustom.slice(1,3),16), g=parseInt(accentCustom.slice(3,5),16), b=parseInt(accentCustom.slice(5,7),16);
      var c=function(n){return Math.min(255,n+30).toString(16).padStart(2,'0');};
      root.style.setProperty('--accent-hover','#'+c(r)+c(g)+c(b));
    } else if (accent && PRESETS[accent]) {
      root.style.setProperty('--accent', PRESETS[accent][0]);
      root.style.setProperty('--accent-hover', PRESETS[accent][1]);
    }
  } catch(e) {}
})();
`.trim();

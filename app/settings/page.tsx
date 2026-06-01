"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import {
  ACCENT_PRESETS,
  type AccentPreset,
  type BgMode,
  deriveHover,
  profileKey,
} from "@/lib/theme";

const FIT_KEY = "reader.fit";
const DEFAULT_MODE_KEY = "reader.defaultMode";
const BRIGHTNESS_KEY = "reader.brightness";
const SEPIA_KEY = "reader.sepia";

type Fit = "width" | "height" | "screen" | "original";
type Mode = "strip" | "paged";

const FIT_LABELS: Record<Fit, string> = {
  width: "Fit width",
  height: "Fit height",
  screen: "Fit screen",
  original: "Original",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-content-faint">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-content">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-content-faint">{hint}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
        (checked ? "bg-accent" : "bg-surface-3")
      }
    >
      <span
        className={
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}

export default function SettingsPage() {
  const { prefs, setAccent, setBgMode } = useTheme();

  const [defaultMode, setDefaultModeState] = useState<Mode>("strip");
  const [defaultFit, setDefaultFitState] = useState<Fit>("width");
  const [defaultBrightness, setDefaultBrightnessState] = useState(0);
  const [defaultSepia, setDefaultSepiaState] = useState(false);

  useEffect(() => {
    const m = localStorage.getItem(profileKey(DEFAULT_MODE_KEY)) as Mode | null;
    if (m === "strip" || m === "paged") setDefaultModeState(m);
    const f = localStorage.getItem(profileKey(FIT_KEY)) as Fit | null;
    if (f && ["width", "height", "screen", "original"].includes(f)) setDefaultFitState(f as Fit);
    const b = Number(localStorage.getItem(profileKey(BRIGHTNESS_KEY)) ?? "0");
    if (!isNaN(b)) setDefaultBrightnessState(Math.min(60, Math.max(0, b)));
    const sep = localStorage.getItem(profileKey(SEPIA_KEY));
    setDefaultSepiaState(sep === "1");
  }, []);

  const setDefaultMode = useCallback((m: Mode) => {
    setDefaultModeState(m);
    localStorage.setItem(profileKey(DEFAULT_MODE_KEY), m);
  }, []);

  const setDefaultFit = useCallback((f: Fit) => {
    setDefaultFitState(f);
    localStorage.setItem(profileKey(FIT_KEY), f);
  }, []);

  const setDefaultBrightness = useCallback((v: number) => {
    setDefaultBrightnessState(v);
    localStorage.setItem(profileKey(BRIGHTNESS_KEY), String(v));
  }, []);

  const setDefaultSepia = useCallback((v: boolean) => {
    setDefaultSepiaState(v);
    localStorage.setItem(profileKey(SEPIA_KEY), v ? "1" : "0");
  }, []);

  const [customHex, setCustomHex] = useState(prefs.accentCustom ?? "#7c83ff");
  useEffect(() => {
    setCustomHex(prefs.accentCustom ?? "#7c83ff");
  }, [prefs.accentCustom]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content">Settings</h1>
        <p className="mt-1 text-sm text-content-dim">
          Appearance and reader preferences. All changes save instantly.
        </p>
      </div>

      <Section title="Appearance">
        <div>
          <p className="mb-3 text-sm font-medium text-content">Accent color</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(ACCENT_PRESETS) as [Exclude<AccentPreset, "custom">, { label: string; color: string }][]).map(
              ([key, { label, color }]) => {
                const active = prefs.accent === key;
                return (
                  <button
                    key={key}
                    onClick={() => setAccent(key)}
                    title={label}
                    aria-pressed={active}
                    className={
                      "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition " +
                      (active
                        ? "border-accent bg-accent/10 text-content ring-1 ring-accent"
                        : "border-border bg-surface-2 text-content-dim hover:border-border-strong hover:text-content")
                    }
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </button>
                );
              }
            )}

            <label
              title="Custom hex"
              aria-pressed={prefs.accent === "custom"}
              className={
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition " +
                (prefs.accent === "custom"
                  ? "border-accent bg-accent/10 text-content ring-1 ring-accent"
                  : "border-border bg-surface-2 text-content-dim hover:border-border-strong hover:text-content")
              }
            >
              <span
                className="inline-block h-3 w-3 rounded-full flex-shrink-0 ring-1 ring-white/20"
                style={{ backgroundColor: prefs.accent === "custom" ? prefs.accentCustom : "#888" }}
              />
              <span>Custom</span>
              <input
                type="color"
                value={customHex}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  setAccent("custom", e.target.value);
                }}
                className="sr-only"
                aria-label="Custom accent color picker"
              />
            </label>
          </div>

          {prefs.accent === "custom" && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={customHex}
                maxLength={7}
                placeholder="#rrggbb"
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomHex(v);
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    setAccent("custom", v);
                  }
                }}
                className="w-28 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm text-content focus:border-accent focus:outline-none"
              />
              <div
                className="h-7 w-7 rounded-md ring-1 ring-white/10"
                style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : "transparent" }}
              />
              <div
                className="h-7 w-7 rounded-md ring-1 ring-white/10"
                style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? deriveHover(customHex) : "transparent" }}
              />
              <span className="text-xs text-content-faint">normal / hover</span>
            </div>
          )}
        </div>

        <Row
          label="Background mode"
          hint="OLED black saves battery on OLED screens and reduces eye strain in dark rooms."
        >
          <div className="flex gap-2">
            {(["dark-gray", "oled"] as BgMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setBgMode(mode)}
                aria-pressed={prefs.bgMode === mode}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm transition " +
                  (prefs.bgMode === mode
                    ? "border-accent bg-accent/10 text-content ring-1 ring-accent"
                    : "border-border bg-surface-2 text-content-dim hover:border-border-strong hover:text-content")
                }
              >
                {mode === "dark-gray" ? "Dark gray" : "OLED black"}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Reader defaults">
        <Row
          label="Default reading mode"
          hint="Per-series mode overrides this once you change it in the reader."
        >
          <div className="flex gap-2">
            {(["strip", "paged"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setDefaultMode(m)}
                aria-pressed={defaultMode === m}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm transition " +
                  (defaultMode === m
                    ? "border-accent bg-accent/10 text-content ring-1 ring-accent"
                    : "border-border bg-surface-2 text-content-dim hover:border-border-strong hover:text-content")
                }
              >
                {m === "strip" ? "Strip (scroll)" : "Paged"}
              </button>
            ))}
          </div>
        </Row>

        <Row
          label="Default page fit"
          hint="Applied on first open; press F in reader to cycle."
        >
          <div className="flex flex-wrap justify-end gap-2">
            {(["width", "height", "screen", "original"] as Fit[]).map((f) => (
              <button
                key={f}
                onClick={() => setDefaultFit(f)}
                aria-pressed={defaultFit === f}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm transition " +
                  (defaultFit === f
                    ? "border-accent bg-accent/10 text-content ring-1 ring-accent"
                    : "border-border bg-surface-2 text-content-dim hover:border-border-strong hover:text-content")
                }
              >
                {FIT_LABELS[f]}
              </button>
            ))}
          </div>
        </Row>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-content">Default brightness dim</p>
            <span className="tabular-nums text-xs text-content-dim">{defaultBrightness}%</span>
          </div>
          <p className="mb-3 text-xs text-content-faint">
            Darkens the page overlay. Useful for reading at night.
          </p>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={defaultBrightness}
            onChange={(e) => setDefaultBrightness(Number(e.target.value))}
            className="w-full accent-accent"
            aria-label="Default brightness dim"
          />
        </div>

        <Row
          label="Default warmth (sepia)"
          hint="Applies a subtle sepia tint to reduce blue light."
        >
          <Toggle
            checked={defaultSepia}
            onChange={setDefaultSepia}
            label="Default warmth"
          />
        </Row>
      </Section>

      <Section title="Keyboard shortcuts">
        <p className="text-sm text-content-dim">
          Press{" "}
          <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-content">
            ?
          </kbd>{" "}
          anywhere (when not in a text field) to open the shortcut reference overlay.
        </p>

        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {[
            { keys: "← →", desc: "Previous / next page (paged mode)" },
            { keys: "Space", desc: "Next page (paged mode)" },
            { keys: "[ ]", desc: "Previous / next chapter" },
            { keys: "Esc", desc: "Back to series page" },
            { keys: "f", desc: "Cycle page fit" },
            { keys: "m", desc: "Toggle strip / paged mode" },
            { keys: "/", desc: "Focus search (Browse page)" },
            { keys: "?", desc: "Show this shortcut overlay" },
          ].map(({ keys, desc }) => (
            <div
              key={keys}
              className="flex items-center justify-between gap-4 bg-surface-2/50 px-4 py-2.5"
            >
              <span className="text-sm text-content-dim">{desc}</span>
              <kbd className="inline-flex min-w-[2.5rem] flex-shrink-0 items-center justify-center rounded border border-border-strong bg-surface-2 px-2 py-0.5 font-mono text-xs text-content">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

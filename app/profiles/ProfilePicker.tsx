"use client";

import { useState, useTransition } from "react";
import type { Profile } from "@prisma/client";
import { selectProfile, createAndSelectProfile } from "./actions";

const EMOJI_PRESETS = ["📖", "🐉", "⚔️", "🌸", "🔥", "🌙", "👾", "🎭", "🦊", "💀"];
const COLOR_PRESETS = [
  "#7c3aed",
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#0891b2",
  "#65a30d",
];

function AvatarDisplay({ avatar, name, size = "lg" }: { avatar: string | null; name: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-20 w-20 text-4xl" : "h-12 w-12 text-2xl";
  const isColor = avatar?.startsWith("#");
  if (isColor) {
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: avatar! }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-surface flex items-center justify-center ring-2 ring-border`}>
      <span>{avatar ?? name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function CreateProfileForm({ onCancel }: { onCancel?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(EMOJI_PRESETS[0]);

  return (
    <form
      action={(fd) => {
        startTransition(() => {
          void createAndSelectProfile(fd);
        });
      }}
      className="flex flex-col gap-5 w-full max-w-sm"
    >
      <h2 className="text-xl font-semibold text-center">Create a profile</h2>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted text-center">Choose an avatar</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setSelected(e)}
              className={`h-10 w-10 rounded-full bg-surface text-xl flex items-center justify-center ring-2 transition-all
                ${selected === e ? "ring-accent scale-110" : "ring-border hover:ring-accent/50"}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              className={`h-10 w-10 rounded-full transition-all ring-2
                ${selected === c ? "ring-white scale-110" : "ring-transparent hover:ring-white/30"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <input type="hidden" name="avatar" value={selected} />

      <input
        name="name"
        required
        maxLength={32}
        placeholder="Profile name"
        autoFocus
        className="rounded-lg border border-border bg-surface px-4 py-2 text-base text-content placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted hover:text-content transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Creating..." : "Create profile"}
        </button>
      </div>
    </form>
  );
}

export function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [pending, startTransition] = useTransition();

  if (profiles.length === 0 || showCreate) {
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        {profiles.length > 0 && (
          <h1 className="text-3xl font-bold tracking-tight text-content">New Profile</h1>
        )}
        {profiles.length === 0 && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl">📖</span>
            <h1 className="text-3xl font-bold tracking-tight text-content">Welcome!</h1>
            <p className="text-muted text-sm">Create your first profile to get started.</p>
          </div>
        )}
        <CreateProfileForm onCancel={profiles.length > 0 ? () => setShowCreate(false) : undefined} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10 w-full">
      <h1 className="text-3xl font-bold tracking-tight text-content">Who&apos;s reading?</h1>

      <div className="flex flex-wrap justify-center gap-6">
        {profiles.map((p) => (
          <button
            key={p.id}
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void selectProfile(p.id);
              })
            }
            className="group flex flex-col items-center gap-3 rounded-xl p-4 transition-all hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            <div className="transition-transform group-hover:scale-105 group-focus-visible:scale-105">
              <AvatarDisplay avatar={p.avatar} name={p.name} />
            </div>
            <span className="text-sm font-medium text-muted group-hover:text-content transition-colors">
              {p.name}
            </span>
          </button>
        ))}

        <button
          onClick={() => setShowCreate(true)}
          className="group flex flex-col items-center gap-3 rounded-xl p-4 transition-all hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="h-20 w-20 rounded-full bg-surface ring-2 ring-dashed ring-border flex items-center justify-center text-3xl text-muted group-hover:ring-accent/60 group-hover:text-content transition-all">
            +
          </div>
          <span className="text-sm font-medium text-muted group-hover:text-content transition-colors">
            Add profile
          </span>
        </button>
      </div>
    </div>
  );
}

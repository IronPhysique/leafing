"use client";

import { useState, useTransition, useRef } from "react";
import type { Profile } from "@prisma/client";
import { toast } from "sonner";
import { renameProfile, updateProfileAvatar, removeProfile, createAndSelectProfile } from "../actions";

const EMOJI_PRESETS = ["📖", "🐉", "⚔️", "🌸", "🔥", "🌙", "👾", "🎭", "🦊", "💀"];
const COLOR_PRESETS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#dc2626", "#db2777", "#0891b2", "#65a30d",
];

function AvatarDisplay({ avatar, name, size = "md" }: { avatar: string | null; name: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-14 w-14 text-2xl" : "h-9 w-9 text-base";
  const isColor = avatar?.startsWith("#");
  if (isColor) {
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
        style={{ backgroundColor: avatar! }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-full bg-surface-2 flex items-center justify-center ring-2 ring-border flex-shrink-0`}>
      <span className="leading-none">{avatar ?? name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`h-9 w-9 rounded-full bg-surface text-lg flex items-center justify-center ring-2 transition-all
              ${value === e ? "ring-accent scale-110" : "ring-border hover:ring-accent/50"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-9 w-9 rounded-full transition-all ring-2 flex-shrink-0
              ${value === c ? "ring-white scale-110" : "ring-transparent hover:ring-white/30"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function EditProfileForm({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar ?? EMOJI_PRESETS[0]);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await Promise.all([
          name.trim() !== profile.name ? renameProfile(profile.id, name) : Promise.resolve(),
          avatar !== profile.avatar ? updateProfileAvatar(profile.id, avatar) : Promise.resolve(),
        ]);
        toast.success("Profile updated.");
        onDone();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update profile.");
      }
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-2 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <AvatarDisplay avatar={avatar} name={name || profile.name} size="md" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          placeholder="Profile name"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:text-content transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !name.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({
  profile,
  onConfirm,
  onCancel,
  pending,
}: {
  profile: Profile;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
      <p className="text-sm text-content">
        Delete <span className="font-semibold">{profile.name}</span>? This will permanently remove all
        their library entries, reading progress, and categories.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:text-content transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Deleting..." : "Delete profile"}
        </button>
      </div>
    </div>
  );
}

function ProfileRow({
  profile,
  isActive,
  isLast,
}: {
  profile: Profile;
  isActive: boolean;
  isLast: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await removeProfile(profile.id);
        toast.success(`Deleted "${profile.name}".`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete profile.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <AvatarDisplay avatar={profile.avatar} name={profile.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-content truncate">{profile.name}</span>
            {isActive && (
              <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent ring-1 ring-accent/30">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-content-faint mt-0.5">
            Created {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setMode((m) => m === "edit" ? "idle" : "edit")}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-content-dim hover:text-content hover:border-border-strong transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setMode((m) => m === "delete" ? "idle" : "delete")}
            disabled={isLast}
            title={isLast ? "Cannot delete the last profile" : undefined}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {mode === "edit" && (
        <EditProfileForm profile={profile} onDone={() => setMode("idle")} />
      )}
      {mode === "delete" && (
        <DeleteConfirm
          profile={profile}
          onConfirm={handleDelete}
          onCancel={() => setMode("idle")}
          pending={deletePending}
        />
      )}
    </div>
  );
}

function AddProfileForm({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [avatar, setAvatar] = useState(EMOJI_PRESETS[0]);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) => {
        startTransition(async () => {
          try {
            await createAndSelectProfile(fd);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to create profile.");
          }
        });
      }}
      className="rounded-xl border border-border bg-surface p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-content">Add a profile</h3>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <input type="hidden" name="avatar" value={avatar} />
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={32}
          placeholder="Profile name"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-content placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted hover:text-content transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

export function ProfileManager({
  profiles,
  activeProfileId,
}: {
  profiles: Profile[];
  activeProfileId: string | null;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      {profiles.map((p) => (
        <ProfileRow
          key={p.id}
          profile={p}
          isActive={p.id === activeProfileId}
          isLast={profiles.length === 1}
        />
      ))}

      {showAdd ? (
        <AddProfileForm onDone={() => setShowAdd(false)} />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3 text-sm text-content-dim hover:border-accent/60 hover:text-content hover:bg-surface transition-colors"
        >
          + Add profile
        </button>
      )}
    </div>
  );
}

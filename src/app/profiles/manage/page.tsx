import { listProfiles } from "@/lib/profile";
import { getActiveProfileId } from "@/lib/profile";
import { ProfileManager } from "./ProfileManager";

export const metadata = { title: "Manage Profiles — Leafing" };

export default async function ManageProfilesPage() {
  const [profiles, activeProfileId] = await Promise.all([
    listProfiles(),
    getActiveProfileId(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content">Manage Profiles</h1>
        <p className="mt-1 text-sm text-content-dim">
          Add, rename, or delete profiles. Each profile has its own library and settings.
        </p>
      </div>
      <ProfileManager profiles={profiles} activeProfileId={activeProfileId} />
    </div>
  );
}

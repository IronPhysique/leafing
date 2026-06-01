import { listProfiles } from "@/lib/profile";
import { ProfilePicker } from "./ProfilePicker";

export const metadata = { title: "Who's reading? — Leafing" };

export default async function ProfilesPage() {
  const profiles = await listProfiles();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16">
      <ProfilePicker profiles={profiles} />
    </div>
  );
}

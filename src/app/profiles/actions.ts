"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createProfile, setActiveProfileCookie, deleteProfile, listProfiles, getActiveProfileId } from "@/lib/profile";
import { prisma } from "@/lib/db";

export async function selectProfile(id: string): Promise<void> {
  await setActiveProfileCookie(id);
  redirect("/");
}

export async function createAndSelectProfile(formData: FormData): Promise<void> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const avatar = (formData.get("avatar") as string | null)?.trim() ?? undefined;
  if (!name) return;
  const profile = await createProfile(name, avatar);
  await setActiveProfileCookie(profile.id);
  redirect("/");
}

export async function removeProfile(id: string): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length <= 1) throw new Error("Cannot delete the last profile.");
  await deleteProfile(id);
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    const remaining = profiles.find((p) => p.id !== id);
    if (remaining) await setActiveProfileCookie(remaining.id);
  }
  revalidatePath("/profiles/manage");
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Profile name is required.");
  await prisma.profile.update({ where: { id }, data: { name: trimmed } });
  revalidatePath("/profiles/manage");
  revalidatePath("/");
}

export async function updateProfileAvatar(id: string, avatar: string): Promise<void> {
  await prisma.profile.update({ where: { id }, data: { avatar: avatar.trim() || null } });
  revalidatePath("/profiles/manage");
  revalidatePath("/");
}

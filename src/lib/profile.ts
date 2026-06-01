"use server";

import { cookies } from "next/headers";
import { prisma } from "./db";
import { redirect } from "next/navigation";

const COOKIE_NAME = "mr_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getActiveProfileId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setActiveProfileCookie(id: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function clearActiveProfileCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getActiveProfile() {
  const id = await getActiveProfileId();
  if (!id) return null;
  return prisma.profile.findUnique({ where: { id } });
}

export async function requireProfileId(): Promise<string> {
  const id = await getActiveProfileId();
  if (!id) redirect("/profiles");

  const exists = await prisma.profile.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    redirect("/profiles");
  }
  return id;
}

export async function listProfiles() {
  return prisma.profile.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createProfile(name: string, avatar?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Profile name is required.");
  return prisma.profile.create({ data: { name: trimmed, avatar: avatar?.trim() || null } });
}

export async function deleteProfile(id: string): Promise<void> {
  await prisma.profile.delete({ where: { id } });
}

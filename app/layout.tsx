import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ShortcutOverlay } from "@/components/ShortcutOverlay";
import { CommandPalette } from "@/components/CommandPalette";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { prisma } from "@/lib/db";
import { getActiveProfile } from "@/lib/profile";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Leafing",
  description: "Leafing — your personal manga and manhwa reader. Follow series, track progress, browse sources.",
};

async function getTotalUnread(profileId: string | null): Promise<number> {
  if (!profileId) return 0;
  try {
    const result = await prisma.libraryEntry.aggregate({
      _sum: { unreadCount: true },
      where: { profileId },
    });
    return result._sum.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const activeProfile = await getActiveProfile();
  const totalUnread = await getTotalUnread(activeProfile?.id ?? null);

  return (
    <html lang="en" className={inter.variable} data-profile={activeProfile?.id ?? ""}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-bg text-content antialiased">
        <ThemeProvider>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent)]"
          />
          <AppHeader activeProfile={activeProfile} totalUnread={totalUnread} />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
          <ShortcutOverlay />
          <CommandPalette />
          <Toaster richColors position="bottom-right" theme="dark" />
        </ThemeProvider>
      </body>
    </html>
  );
}

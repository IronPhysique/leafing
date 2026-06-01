import Link from "next/link";
import { getLibrary, getCurrentlyReadingEntries } from "@/lib/queries";
import { getCategories } from "@/lib/library";
import { requireProfileId } from "@/lib/profile";
import { CheckUpdatesButton } from "@/components/CheckUpdatesButton";
import { ResolveTitlesButton } from "@/components/ResolveTitlesButton";
import { CurrentlyReadingShelf } from "@/components/CurrentlyReadingShelf";
import { LibraryGrid } from "@/components/LibraryGrid";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireProfileId();
  const [entries, categories, currentlyReading] = await Promise.all([
    getLibrary(),
    getCategories(),
    getCurrentlyReadingEntries(),
  ]);

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Library</h1>
          <div className="flex items-center gap-2">
            <ResolveTitlesButton />
            <CheckUpdatesButton />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-2xl ring-1 ring-border">
            📚
          </div>
          <p className="text-sm text-content-dim">Your library is empty.</p>
          <Link
            href="/search"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Browse sources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Library</h1>
        <div className="flex items-center gap-2">
          <ResolveTitlesButton />
          <CheckUpdatesButton />
        </div>
      </div>

      <CurrentlyReadingShelf entries={currentlyReading} />

      <LibraryGrid entries={entries} allCategories={categories} />
    </div>
  );
}

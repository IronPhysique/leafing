import Link from "next/link";
import { Cover } from "@/components/Cover";
import { resolveDisplayTitle } from "@/lib/metadata/title";

interface Entry {
  id: string;
  sourceId: string;
  slug: string;
  title: string;
  titleEnglish: string | null;
  titleRomaji: string | null;
  coverUrl: string | null;
  coverReferer: string | null;
}

interface Props {
  entries: Entry[];
}

export function CurrentlyReadingShelf({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-content-dim uppercase tracking-wider">
          Continue Reading
        </h2>
        <span className="text-xs text-content-faint">{entries.length} series</span>
      </div>

      <div
        className={[
          "flex gap-3 overflow-x-auto pb-2",
          "snap-x snap-mandatory",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {entries.map((e) => {
          const displayTitle =
            resolveDisplayTitle({
              english: e.titleEnglish ?? undefined,
              romaji: e.titleRomaji ?? undefined,
            }) || e.title;

          return (
            <div
              key={e.id}
              className="w-28 flex-none snap-start"
            >
              <Cover
                href={`/series/${e.sourceId}/${encodeURIComponent(e.slug)}`}
                title={displayTitle}
                coverUrl={e.coverUrl ?? undefined}
                coverReferer={e.coverReferer ?? undefined}
                vtKey={`${e.sourceId}/${e.slug}`}
              />
            </div>
          );
        })}

        {entries.length > 8 && (
          <div className="w-20 flex-none snap-start">
            <Link
              href="/library"
              className={[
                "flex aspect-[2/3] w-full items-center justify-center rounded-xl",
                "bg-surface ring-1 ring-border text-xs text-content-dim",
                "hover:bg-surface-2 transition",
              ].join(" ")}
            >
              See all
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

import { Cover } from "@/components/Cover";

export function SeriesCard({
  href,
  title,
  coverUrl,
  coverReferer,
  badge,
  unreadCount,
}: {
  href: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
  badge?: string;
  unreadCount?: number;
}) {
  const vtKey = href.startsWith("/series/") ? href.slice("/series/".length) : undefined;

  return (
    <Cover
      href={href}
      title={title}
      coverUrl={coverUrl}
      coverReferer={coverReferer}
      badge={badge}
      unreadCount={unreadCount}
      vtKey={vtKey}
    />
  );
}

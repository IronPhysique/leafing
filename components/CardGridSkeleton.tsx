export function CardGridSkeleton({ count = 14 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton aspect-[2/3] rounded-xl ring-1 ring-border"
        />
      ))}
    </div>
  );
}

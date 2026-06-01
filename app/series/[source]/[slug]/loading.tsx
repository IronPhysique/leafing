export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="skeleton h-72 w-48 flex-none self-center rounded-xl sm:self-start" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-8 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-9 w-28 rounded-md" />
            <div className="skeleton h-9 w-32 rounded-md" />
          </div>
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-20 w-full rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-6 w-40 rounded" />
        <div className="space-y-px overflow-hidden rounded-lg ring-1 ring-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

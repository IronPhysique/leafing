import { CardGridSkeleton } from "@/components/CardGridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-9 flex-1 rounded-md" />
        <div className="skeleton h-9 w-20 rounded-md" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-7 w-24 rounded-full" />
        <div className="skeleton h-7 w-20 rounded-full" />
        <div className="skeleton h-7 w-20 rounded-full" />
      </div>
      <CardGridSkeleton />
    </div>
  );
}

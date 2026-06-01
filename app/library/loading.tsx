import { CardGridSkeleton } from "@/components/CardGridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-7 w-32 rounded" />
      <CardGridSkeleton />
    </div>
  );
}

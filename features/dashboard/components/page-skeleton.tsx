import { Skeleton } from "@/components/ui/skeleton";

/** Generic dashboard loading placeholder: header + toolbar + table rows. */
export default function PageSkeleton(): React.ReactNode {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="กำลังโหลด">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-90" />
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line p-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

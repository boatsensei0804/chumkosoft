import LoadingBanner from "@/components/ui/loading-banner";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared route fallback for dashboard pages. The shapes suggest the layout without fake data. */
export default function PageSkeleton(): React.ReactNode {
  return (
    <div className="flex flex-col gap-5">
      <LoadingBanner
        title="กำลังเตรียมพื้นที่ทำงาน"
        description="กำลังโหลดข้อมูลล่าสุดของโรงเรียน เพื่อให้คุณเริ่มทำงานต่อได้ทันที"
      />

      <div aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-[18px] border border-line bg-bg p-4 shadow-sm sm:p-5">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="mt-4 h-3 w-24 max-w-full" />
            <Skeleton className="mt-2.5 h-7 w-16" />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="overflow-hidden rounded-[20px] border border-line bg-bg shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-5">
            <div className="space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-3 w-52 max-w-full" /></div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line/70 pb-4 last:border-0 last:pb-0">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[20px] border border-line bg-bg p-5 shadow-sm">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-3 h-3 w-52 max-w-full" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

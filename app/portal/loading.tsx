import LoadingBanner from "@/components/ui/loading-banner";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading(): React.ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <LoadingBanner
        title="กำลังเตรียมหน้าของคุณ"
        description="กำลังโหลดข้อมูลนักเรียนและตารางเรียนล่าสุด"
      />
      <section aria-hidden="true" className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <div className="overflow-hidden rounded-[20px] border border-line bg-bg p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-2 gap-3 border-b border-line pb-4 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      </section>
    </div>
  );
}

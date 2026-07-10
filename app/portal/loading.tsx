import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading(): React.ReactNode {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="กำลังโหลด">
      <Skeleton className="h-30 rounded-[20px]" />
      <Skeleton className="h-90 rounded-2xl" />
    </div>
  );
}

import Skeleton from "@mui/material/Skeleton";

export default function PortalLoading(): React.ReactNode {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="กำลังโหลด">
      <Skeleton variant="rounded" height={120} sx={{ borderRadius: "20px", bgcolor: "var(--surface-sunken)" }} />
      <Skeleton variant="rounded" height={360} sx={{ borderRadius: "16px", bgcolor: "var(--surface-sunken)" }} />
    </div>
  );
}

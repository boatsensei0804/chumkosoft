import Skeleton from "@mui/material/Skeleton";

/** Generic dashboard loading placeholder: header + toolbar + table rows. */
export default function PageSkeleton(): React.ReactNode {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="กำลังโหลด">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={220} height={34} sx={{ bgcolor: "var(--surface-sunken)" }} />
        <Skeleton variant="text" width={360} height={20} sx={{ bgcolor: "var(--surface-sunken)" }} />
      </div>

      <div
        className="flex flex-col overflow-hidden rounded-[16px]"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <Skeleton variant="rounded" width={220} height={36} sx={{ bgcolor: "var(--surface-sunken)" }} />
          <Skeleton variant="rounded" width={140} height={36} sx={{ bgcolor: "var(--surface-sunken)" }} />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={44} sx={{ bgcolor: "var(--surface-sunken)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

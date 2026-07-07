"use client";

import IconButton from "@mui/material/IconButton";
import Icon from "@/features/dashboard/components/icon";

interface PaginationBarProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

/** Footer showing the current range and prev/next controls for a server-paged list. */
export default function PaginationBar({ page, pageCount, total, pageSize, disabled, onPageChange }: PaginationBarProps): React.ReactNode {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div
      className="flex items-center justify-between px-5 py-2.5 text-[13px] text-muted"
      style={{ borderTop: "1px solid var(--line)", backgroundColor: "var(--surface)" }}
    >
      <span className="tabular">
        {total === 0 ? "ไม่มีรายการ" : `แสดง ${from.toLocaleString("th-TH")}–${to.toLocaleString("th-TH")} จาก ${total.toLocaleString("th-TH")} รายการ`}
      </span>
      <div className="flex items-center gap-1">
        <IconButton size="small" aria-label="หน้าก่อนหน้า" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          <Icon name="chevron_down" sx={{ fontSize: 20, transform: "rotate(90deg)" }} />
        </IconButton>
        <span className="tabular px-1 text-[12.5px] font-semibold text-ink">
          {page} / {pageCount}
        </span>
        <IconButton size="small" aria-label="หน้าถัดไป" disabled={disabled || page >= pageCount} onClick={() => onPageChange(page + 1)}>
          <Icon name="chevron_down" sx={{ fontSize: 20, transform: "rotate(-90deg)" }} />
        </IconButton>
      </div>
    </div>
  );
}

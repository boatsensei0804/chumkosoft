"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center justify-between border-t border-line bg-surface px-5 py-2.5 text-[13px] text-muted">
      <span className="tabular">
        {total === 0 ? "ไม่มีรายการ" : `แสดง ${from.toLocaleString("th-TH")}–${to.toLocaleString("th-TH")} จาก ${total.toLocaleString("th-TH")} รายการ`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted hover:text-ink"
          aria-label="หน้าก่อนหน้า"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="tabular px-1 text-[12.5px] font-semibold text-ink">
          {page} / {pageCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted hover:text-ink"
          aria-label="หน้าถัดไป"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

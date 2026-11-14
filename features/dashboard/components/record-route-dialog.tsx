"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function RecordRouteDialog({ title, children }: { title: string; children: ReactNode }): ReactNode {
  const router = useRouter();
  return (
    <Dialog open onOpenChange={(open) => { if (!open) router.back(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-2xl bg-bg p-0 sm:max-h-[min(92dvh,980px)]">
        <DialogHeader className="shrink-0 border-b border-line px-5 py-4 pr-14 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

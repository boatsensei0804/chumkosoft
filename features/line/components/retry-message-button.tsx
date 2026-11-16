"use client";
import { useState, useTransition } from "react";
import { retryFailedLineDeliveryAction } from "@/features/line/message-history-actions";
export default function RetryMessageButton({ id }: { id: string }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  return <div><button disabled={pending} onClick={() => start(async () => { const result = await retryFailedLineDeliveryAction(id); setMessage(result.message); })} className="min-h-10 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50">{pending ? "กำลังส่ง…" : "ส่งซ้ำ"}</button>{message && <p role="status" className="mt-1 text-xs">{message}</p>}</div>;
}

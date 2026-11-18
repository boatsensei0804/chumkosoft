"use client";

import { useState, useTransition } from "react";
import { retryEmergencyMessageAction } from "@/features/faces/emergency-retry-actions";

export default function RetryEmergencyMessageButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return <div>
    <button disabled={pending} onClick={() => start(async () => {
      const result = await retryEmergencyMessageAction(id);
      setMessage(result.message);
    })} className="min-h-10 rounded-lg border border-danger/30 px-3 text-sm font-semibold text-danger disabled:opacity-50">
      {pending ? "กำลังส่ง…" : "ส่งซ้ำ"}
    </button>
    {message && <p role="status" className="mt-1 text-xs">{message}</p>}
  </div>;
}

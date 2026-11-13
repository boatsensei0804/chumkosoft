"use client";

import { useState, useTransition } from "react";
import { saveAdvisorDigestTime } from "@/features/settings/advisor-digest-actions";

export default function AdvisorDigestTime({ initialTime }: { initialTime: string }): React.ReactNode {
  const [time, setTime] = useState(initialTime);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <section className="rounded-2xl border border-line bg-card p-5">
    <h2 className="text-base font-bold text-ink-strong">สรุปเข้าโรงเรียนทาง LINE สำหรับครูที่ปรึกษา</h2>
    <p className="mt-1 text-sm text-muted">ส่งวันจันทร์–ศุกร์ตามเวลาไทย หลังครูเชื่อม LINE แล้ว · ตั้งเวลาได้ทีละครึ่งชั่วโมง</p>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">เวลาส่ง
        <input type="time" step={1800} value={time} onChange={(event) => setTime(event.target.value)} className="rounded-lg border border-line bg-bg px-3 py-2" />
      </label>
      <button type="button" disabled={pending} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => startTransition(async () => {
        const result = await saveAdvisorDigestTime(time);
        setMessage(result.message);
      })}>{pending ? "กำลังบันทึก…" : "บันทึกเวลา"}</button>
    </div>
    {message && <p className="mt-3 text-sm text-ink" role="status">{message}</p>}
  </section>;
}

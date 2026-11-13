"use client";

import { useState, useTransition } from "react";
import { saveAdvisorDigestTime, saveLineOaFriendUrl } from "@/features/settings/advisor-digest-actions";

export default function AdvisorDigestTime({ initialTime, initialFriendUrl }: { initialTime: string; initialFriendUrl: string }): React.ReactNode {
  const [time, setTime] = useState(initialTime);
  const [friendUrl, setFriendUrl] = useState(initialFriendUrl);
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
    <div className="mt-5 border-t border-line pt-5">
      <label className="block text-sm font-semibold text-ink" htmlFor="line-oa-friend-url">ลิงก์เพิ่มเพื่อน LINE OA สำหรับครู</label>
      <p className="mt-1 text-xs text-muted">คัดลอกจาก LINE Official Account Manager เพื่อให้ครูกดเพิ่มเพื่อนจากหน้า LINE ของฉัน</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="line-oa-friend-url" type="url" value={friendUrl} onChange={(event) => setFriendUrl(event.target.value)} placeholder="https://lin.ee/..." className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <button type="button" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => startTransition(async () => {
          const result = await saveLineOaFriendUrl(friendUrl);
          setMessage(result.message);
        })}>{pending ? "กำลังบันทึก…" : "บันทึกลิงก์"}</button>
      </div>
    </div>
    {message && <p className="mt-3 text-sm text-ink" role="status">{message}</p>}
  </section>;
}

"use client";

import { useState, useTransition } from "react";
import { createMyAdvisorLineCode } from "@/features/attendance/advisor-line-actions";

export default function AdvisorLineConnect({ linked, currentCode }: { linked: boolean; currentCode: string | null }): React.ReactNode {
  const [code, setCode] = useState(currentCode);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  if (linked) return <p className="rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-ink">LINE ครูที่ปรึกษาเชื่อมแล้ว · รับสรุปเวลา 09:00 น.</p>;
  return <div className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink">
    <p className="font-semibold">รับสรุปการเข้าโรงเรียนทาง LINE</p>
    <p className="mt-1 text-muted">เพิ่มเพื่อน LINE OA ของโรงเรียน แล้วส่งรหัส 6 หลักในแชท</p>
    {code && <p className="mt-2 font-mono text-xl font-bold tracking-widest text-brand-ink">{code}</p>}
    {error && <p className="mt-2 text-danger">{error}</p>}
    <button type="button" className="mt-2 rounded-lg bg-brand px-3 py-2 font-semibold text-white disabled:opacity-50" disabled={pending} onClick={() => startTransition(async () => {
      const result = await createMyAdvisorLineCode();
      if (result.ok) { setCode(result.code ?? null); setError(""); }
      else setError(result.message ?? "สร้างรหัสไม่ได้");
    })}>{pending ? "กำลังสร้าง…" : code ? "สร้างรหัสใหม่" : "สร้างรหัสเชื่อม LINE"}</button>
  </div>;
}

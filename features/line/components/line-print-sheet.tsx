"use client";

import { Printer } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface PrintableGuardian {
  id: string;
  prefix: string | null;
  fullName: string;
  relation: string;
  linked: boolean;
  linkCode: string | null;
}

interface PrintableStudent {
  studentId: string;
  studentCode: string;
  studentName: string;
  classroom: string;
  guardians: PrintableGuardian[];
}

interface LinePrintSheetProps {
  classroom: string;
  oaUrl: string;
  qrDataUrl: string;
  records: PrintableStudent[];
}

export default function LinePrintSheet({ classroom, oaUrl, qrDataUrl, records }: LinePrintSheetProps): React.ReactNode {
  const cards = records.flatMap((student) => student.guardians.map((guardian) => ({ student, guardian })));
  const pages: typeof cards[] = [];
  for (let i = 0; i < cards.length; i += 6) pages.push(cards.slice(i, i + 6));

  return (
    <main className="line-print-root min-h-screen bg-surface px-4 py-5 sm:px-8">
      <header className="line-print-toolbar mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bg p-4 shadow-sm">
        <div><p className="text-sm font-bold text-ink-strong">เอกสารเชื่อม LINE · {classroom}</p><p className="mt-0.5 text-xs text-muted">{cards.length.toLocaleString("th-TH")} ใบ · A4 แนวตั้ง · QR เพิ่มเพื่อน LINE OA</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => window.close()}>ปิด</Button><Button onClick={() => window.print()}><Printer className="size-4" /> พิมพ์ / บันทึก PDF</Button></div>
      </header>
      {cards.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-bg p-10 text-center text-sm text-muted">ชั้นเรียนนี้ยังไม่มีข้อมูลผู้ปกครองสำหรับทำเอกสาร</div>
      ) : (
        <div className="line-print-pages mx-auto flex max-w-5xl flex-col gap-5">
          {pages.map((page, pageIndex) => (
            <section className="line-print-page" key={pageIndex}>
              {page.map(({ student, guardian }) => (
                <article className="line-parent-card" key={guardian.id}>
                  <div className="line-parent-card__head"><span>ระบบแจ้งเตือนผู้ปกครอง</span><span>ชั้น {student.classroom}</span></div>
                  <div className="line-parent-card__content">
                    <div className="line-parent-card__identity">
                      <p className="line-parent-card__eyebrow">ข้อมูลนักเรียน</p>
                      <h2>{student.studentName}</h2>
                      <p>รหัสนักเรียน {student.studentCode}</p>
                      <div className="line-parent-card__rule" />
                      <p className="line-parent-card__eyebrow">ผู้ปกครอง</p>
                      <h3>{[guardian.prefix, guardian.fullName].filter(Boolean).join(" ")}</h3>
                      <p>{guardian.relation}</p>
                    </div>
                    <div className="line-parent-card__qr-wrap"><Image src={qrDataUrl} alt="QR เพิ่มเพื่อน LINE OA โรงเรียน" width={280} height={280} unoptimized className="line-parent-card__qr" /><span>สแกนเพื่อเพิ่มเพื่อน</span></div>
                  </div>
                  <div className="line-parent-card__steps"><b>วิธีรับแจ้งเตือน LINE</b><span>1. สแกน QR เพิ่มเพื่อน OA</span><span>2. ส่งรหัสด้านล่างในแชท</span><span>3. รอข้อความยืนยัน</span></div>
                  <div className="line-parent-card__code"><span>{guardian.linked ? "สถานะบัญชี" : "รหัสผูกบัญชี"}</span><strong>{guardian.linked ? "เชื่อม LINE แล้ว" : guardian.linkCode ?? "ยังไม่มีรหัส · ติดต่อโรงเรียน"}</strong></div>
                  <footer>ลิงก์ทางการ: {oaUrl}</footer>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

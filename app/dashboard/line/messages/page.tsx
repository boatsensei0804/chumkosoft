import { requireRoles } from "@/lib/dal";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import RetryMessageButton from "@/features/line/components/retry-message-button";
import { getLineApiSummary } from "@/features/line/services/message-api-summary";
import { MessagesSquare, CircleCheck, CircleAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "ประวัติและโควตา LINE · chumkosoft" };
export default async function LineMessagesPage() {
  await requireRoles(["ADMIN"]);
  const summary = await getLineApiSummary();
  const daily = new Map<string, { attendance: number; teacher: number; accepted: number; failed: number }>();
  for (const row of summary.byDay ?? []) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(row.createdAt);
    const bucket = daily.get(day) ?? { attendance: 0, teacher: 0, accepted: 0, failed: 0 };
    if (row.kind === "ATTENDANCE") bucket.attendance++;
    if (row.kind === "TEACHER_DIGEST") bucket.teacher++;
    if (row.status === "ACCEPTED") bucket.accepted++;
    else bucket.failed++;
    daily.set(day, bucket);
  }
  return <><PageHeader title="ประวัติและการใช้งาน LINE API" subtitle="ตรวจยอดใช้โควตาและส่งซ้ำเฉพาะรายการแจ้งเข้าเรียนที่ส่งไม่สำเร็จ" />
    <StatStrip items={[
      { label: "ใช้แล้วตาม LINE API", value: summary.used ?? "—", hint: summary.quota ? `/ ${summary.quota}` : "ข้อความ", icon: MessagesSquare, tone: "brand" },
      { label: "ส่งสำเร็จในระบบเดือนนี้", value: summary.accepted ?? "—", hint: "รายการข้อความ", icon: CircleCheck, tone: "success" },
      { label: "ส่งไม่สำเร็จค้างอยู่", value: summary.failed ?? "—", hint: "รายการ", icon: CircleAlert, tone: "warning" },
    ]} />
    {summary.error && <p role="status" className="my-4 rounded-xl bg-amber-50 p-4 text-sm">{summary.error}</p>}
    <p className="my-4 text-sm text-muted">ยอดใช้จาก LINE เป็นยอดรวมตามรอบโควตาของบัญชี อาจไม่ตรงกับจำนวนรายการในระบบทุกประการ การกดส่งซ้ำจะนับโควตาเพิ่ม</p>
    <section className="my-5 rounded-2xl border bg-white"><h2 className="border-b p-4 font-bold">สรุปรายวันย้อนหลัง 30 วัน · แจ้งเข้าเรียนและสรุปครู</h2><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50"><tr>{["วันที่", "เข้าเรียน", "สรุปครู", "LINE รับคำขอ", "ล้มเหลว"].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y">{[...daily.entries()].map(([day, x]) => <tr key={day}><td className="p-3">{day}</td><td className="p-3">{x.attendance}</td><td className="p-3">{x.teacher}</td><td className="p-3">{x.accepted}</td><td className="p-3">{x.failed}</td></tr>)}</tbody></table></div></section>
    <section className="my-5 rounded-2xl border bg-white"><h2 className="border-b p-4 font-bold">ประกาศ LINE ล่าสุด</h2><div className="divide-y">{summary.announcements?.map(row => { const accepted = row.batches.filter(b => b.status === "ACCEPTED").reduce((n,b) => n + b.recipientCount, 0); const failed = row.batches.filter(b => b.status === "FAILED").reduce((n,b) => n + b.recipientCount, 0); return <article key={row.id} className="flex flex-wrap justify-between gap-3 p-4"><div><p className="font-semibold">{row.title}</p><p className="text-sm text-muted">ประกาศ · {row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · สำเร็จ {accepted}/{row.recipientCount} · ล้มเหลว {failed}</p>{row.batches.find(b => b.errorCode)?.errorCode && <p className="text-sm text-amber-700">รหัสผิดพลาด {row.batches.find(b => b.errorCode)?.errorCode}</p>}</div>{failed > 0 && <Link className="min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold" href="/dashboard/line-announcements">เปิดรายการเพื่อส่งต่อ</Link>}</article>; })}{!summary.announcements?.length && <p className="p-6 text-sm text-muted">ยังไม่มีประวัติประกาศ</p>}</div></section>
    <section className="rounded-2xl border bg-white"><h2 className="border-b p-4 font-bold">ข้อความแจ้งเข้าเรียน / แจ้งครูที่ส่งไม่สำเร็จ</h2><div className="divide-y">{summary.failedRecent?.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{row.title}</p><p className="mt-1 text-sm text-muted">{row.kind === "ATTENDANCE" ? "เข้าเรียน" : "สรุปครู"} · ผู้รับ {row.recipientLabel ?? "LINE ID ซ่อน"} · {row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · รหัส {row.errorCode ?? "ไม่ทราบสาเหตุ"}</p><p className="mt-1 text-sm">{row.body}</p></div><RetryMessageButton id={row.id} /></article>)}{!summary.failedRecent?.length && <p className="p-8 text-center text-sm text-muted">ไม่มีรายการล้มเหลว</p>}</div></section>
  </>;
}

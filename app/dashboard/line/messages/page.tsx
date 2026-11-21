import { requireRoles } from "@/lib/dal";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import RetryMessageButton from "@/features/line/components/retry-message-button";
import { getLineApiSummary } from "@/features/line/services/message-api-summary";
import { MessagesSquare, CircleCheck, CircleAlert } from "lucide-react";
import Link from "next/link";
import MascotEmptyState from "@/components/ui/mascot-empty-state";

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
    {summary.error && <p role="alert" className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{summary.error}</p>}
    <p className="my-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-relaxed text-ink">“LINE รับคำขอแล้ว” หมายถึง API ยอมรับคำขอและมี Request ID สำหรับอ้างอิง ยังยืนยันไม่ได้ว่าข้อความถึงห้องแชทหรือผู้รับอ่านแล้ว</p>
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-sm xl:col-span-2">
        <h2 className="border-b border-blue-100 px-5 py-4 text-base font-bold text-ink-strong">สรุปรายวันย้อนหลัง 30 วัน</h2>
        {daily.size ? <div className="max-h-[34dvh] overflow-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 z-10 bg-[#edf5ff] text-brand-ink"><tr>{["วันที่", "เข้าเรียน", "สรุปครู", "LINE รับคำขอ", "ล้มเหลว"].map(x => <th key={x} scope="col" className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-blue-50">{[...daily.entries()].map(([day, x]) => <tr key={day} className="hover:bg-blue-50/50"><td className="px-4 py-3 font-semibold">{day}</td><td className="px-4 py-3 tabular-nums">{x.attendance}</td><td className="px-4 py-3 tabular-nums">{x.teacher}</td><td className="px-4 py-3 tabular-nums text-success">{x.accepted}</td><td className="px-4 py-3 tabular-nums text-danger">{x.failed}</td></tr>)}</tbody></table></div> : <MascotEmptyState compact pose="notify" className="m-4" title="ยังไม่มีประวัติส่งข้อความในช่วงนี้" />}
      </section>
      <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-sm"><h2 className="border-b border-blue-100 px-5 py-4 text-base font-bold text-ink-strong">ประกาศ LINE ล่าสุด</h2><div className="max-h-[42dvh] divide-y divide-blue-50 overflow-y-auto">{summary.announcements?.map(row => { const accepted = row.batches.filter(b => b.status === "ACCEPTED").reduce((n,b) => n + b.recipientCount, 0); const failed = row.batches.filter(b => b.status === "FAILED").reduce((n,b) => n + b.recipientCount, 0); return <article key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold text-ink-strong">{row.title}</p><p className="mt-1 text-sm text-muted">{row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p><p className="mt-2 text-sm"><span className="font-semibold text-success">LINE รับ {accepted}/{row.recipientCount}</span><span className="mx-2 text-line">·</span><span className={failed ? "font-semibold text-danger" : "text-muted"}>ล้มเหลว {failed}</span></p>{row.batches.find(b => b.errorCode)?.errorCode && <p className="mt-1 text-sm text-danger">รหัสผิดพลาด: {row.batches.find(b => b.errorCode)?.errorCode}</p>}</div>{failed > 0 && <Link className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-brand-ink hover:bg-blue-50" href="/dashboard/line-announcements">เปิดรายการเพื่อส่งต่อ</Link>}</article>; })}{!summary.announcements?.length && <MascotEmptyState compact pose="notify" className="m-4" title="ยังไม่มีประวัติประกาศ" />}</div></section>
      <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-sm"><h2 className="border-b border-blue-100 px-5 py-4 text-base font-bold text-ink-strong">แจ้งเข้าเรียนและแจ้งครูที่ส่งไม่สำเร็จ</h2><div className="max-h-[42dvh] divide-y divide-blue-50 overflow-y-auto">{summary.failedRecent?.map(row => <article key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold text-ink-strong">{row.title}</p><p className="mt-1 text-sm text-muted">{row.kind === "ATTENDANCE" ? "เข้าเรียน" : "สรุปครู"} · ผู้รับ {row.recipientLabel ?? "LINE ID ซ่อน"} · {row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p><p className="mt-1 text-sm font-semibold text-danger">รหัส {row.errorCode ?? "ไม่ทราบสาเหตุ"} · ลองส่ง {row.attempts} ครั้ง</p><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-ink">{row.body}</p>{row.requestId && <p className="mt-1 break-all text-xs text-muted">Request ID: {row.requestId}{row.acceptedRequestId ? ` · Accepted request: ${row.acceptedRequestId}` : ""}</p>}</div><RetryMessageButton id={row.id} /></article>)}{!summary.failedRecent?.length && <MascotEmptyState compact pose="success" className="m-4" title="ไม่มีรายการส่งล้มเหลว" />}</div></section>
    </div>
  </>;
}

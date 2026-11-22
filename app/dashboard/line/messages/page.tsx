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
export default async function LineMessagesPage({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; date?: string }> }) {
  await requireRoles(["ADMIN"]);
  const filters = await searchParams;
  const summary = await getLineApiSummary(filters);
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
  return <><PageHeader title="ประวัติและการใช้งาน LINE API" subtitle="ดูโควตา ประวัติการส่ง และรายการที่ต้องลองส่งใหม่" />
    <StatStrip items={[
      { label: "ใช้แล้วตาม LINE API", value: summary.used ?? "—", hint: summary.quota ? `/ ${summary.quota}` : "ข้อความ", icon: MessagesSquare, tone: "brand" },
      { label: "LINE รับคำขอเดือนนี้", value: summary.accepted ?? "—", hint: "รายการข้อความ", icon: CircleCheck, tone: "success" },
      { label: "ส่งไม่สำเร็จค้างอยู่", value: summary.failed ?? "—", hint: "รายการ", icon: CircleAlert, tone: "warning" },
    ]} />
    {summary.error && <p role="alert" className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{summary.error}</p>}
    <p className="my-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-relaxed text-ink">“LINE รับคำขอแล้ว” หมายถึง API ยอมรับคำขอและมี Request ID สำหรับอ้างอิง ยังยืนยันไม่ได้ว่าข้อความถึงห้องแชทหรือผู้รับอ่านแล้ว</p>
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="overflow-hidden rounded-[22px] school-card xl:col-span-2">
        <h2 className="border-b border-blue-100 px-5 py-4 text-base font-bold text-ink-strong">สรุปรายวันย้อนหลัง 30 วัน</h2>
        {daily.size ? <div className="max-h-[34dvh] overflow-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 z-10 bg-[#edf5ff] text-brand-ink"><tr>{["วันที่", "เข้าเรียน", "สรุปครู", "LINE รับคำขอ", "ล้มเหลว"].map(x => <th key={x} scope="col" className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-blue-50">{[...daily.entries()].map(([day, x]) => <tr key={day} className="hover:bg-blue-50/50"><td className="px-4 py-3 font-semibold">{day}</td><td className="px-4 py-3 tabular-nums">{x.attendance}</td><td className="px-4 py-3 tabular-nums">{x.teacher}</td><td className="px-4 py-3 tabular-nums text-success">{x.accepted}</td><td className="px-4 py-3 tabular-nums text-danger">{x.failed}</td></tr>)}</tbody></table></div> : <MascotEmptyState compact pose="notify" className="m-4" title="ยังไม่มีประวัติส่งข้อความในช่วงนี้" />}
      </section>
      <section className="overflow-hidden rounded-[22px] school-card"><h2 className="border-b border-blue-100 px-5 py-4 text-base font-bold text-ink-strong">ประกาศ LINE ล่าสุด</h2><div className="divide-y divide-blue-50 lg:max-h-[42dvh] lg:overflow-y-auto">{summary.announcements?.map(row => { const accepted = row.batches.filter(b => b.status === "ACCEPTED").reduce((n,b) => n + b.recipientCount, 0); const failed = row.batches.filter(b => b.status === "FAILED").reduce((n,b) => n + b.recipientCount, 0); return <article key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold text-ink-strong">{row.title}</p><p className="mt-1 text-sm text-muted">{row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p><p className="mt-2 text-sm"><span className="font-semibold text-success">LINE รับ {accepted}/{row.recipientCount}</span><span className="mx-2 text-line">·</span><span className={failed ? "font-semibold text-danger" : "text-muted"}>ล้มเหลว {failed}</span></p>{row.batches.find(b => b.errorCode)?.errorCode && <p className="mt-1 text-sm text-danger">รหัสผิดพลาด: {row.batches.find(b => b.errorCode)?.errorCode}</p>}</div>{failed > 0 && <Link className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-brand-ink hover:bg-blue-50" href="/dashboard/line-announcements">เปิดรายการเพื่อส่งต่อ</Link>}</article>; })}{!summary.announcements?.length && <MascotEmptyState compact pose="notify" className="m-4" title="ยังไม่มีประวัติประกาศ" />}</div></section>
      <section className="overflow-hidden rounded-[22px] school-card">
        <h2 className="border-b border-blue-100 px-5 py-4 text-base font-bold text-ink-strong">ประวัติการส่งรายบัญชี</h2>
        <form className="flex flex-wrap items-end gap-2 border-b border-blue-100 p-4" action="/dashboard/line/messages">
          <label className="grid gap-1 text-xs font-semibold">วันที่
            <input name="date" type="date" defaultValue={filters.date} className="min-h-10 rounded-lg border border-line px-2" />
          </label>
          <label className="grid gap-1 text-xs font-semibold">ประเภท
            <select name="kind" defaultValue={filters.kind ?? ""} className="min-h-10 rounded-lg border border-line px-2">
              <option value="">ทุกประเภท</option><option value="ATTENDANCE">แจ้งเข้าโรงเรียน</option><option value="TEACHER_DIGEST">สรุปครู</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">สถานะ
            <select name="status" defaultValue={filters.status ?? ""} className="min-h-10 rounded-lg border border-line px-2">
              <option value="">ทุกสถานะ</option><option value="ACCEPTED">LINE รับคำขอแล้ว</option><option value="FAILED">ส่งไม่สำเร็จ</option>
            </select>
          </label>
          <button className="min-h-10 rounded-lg bg-brand px-3 text-sm font-semibold text-white">กรอง</button>
        </form>
        <p className="px-4 pt-3 text-xs text-muted">แสดงสูงสุด 100 รายการล่าสุดตามตัวกรอง</p>
        <div className="divide-y divide-blue-50 lg:max-h-[48dvh] lg:overflow-y-auto">
          {summary.recent.map((row) => (
            <article key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-strong">{row.title}</p>
                <p className="mt-1 text-sm text-muted">{row.recipientLabel ?? "บัญชี LINE"} · เริ่มส่ง {row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
                <p className={`mt-1 text-sm font-semibold ${row.status === "ACCEPTED" ? "text-success" : "text-danger"}`}>
                  {row.status === "ACCEPTED" ? "LINE รับคำขอแล้ว" : `ส่งไม่สำเร็จ · ${row.errorCode ?? "ไม่ทราบสาเหตุ"}`} · ลองส่ง {row.attempts} ครั้ง
                </p>
                {row.attempts > 1 && <p className="mt-1 text-xs text-muted">ลองล่าสุด {row.updatedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>}
                {(row.acceptedRequestId || row.requestId) && <p className="mt-1 break-all text-xs text-muted">Request ID: {row.acceptedRequestId ?? row.requestId}</p>}
              </div>
              {row.status === "FAILED" && <RetryMessageButton id={row.id} />}
            </article>
          ))}
          {!summary.recent.length && <MascotEmptyState compact pose="notify" className="m-4" title="ไม่มีรายการที่ตรงกับตัวกรอง" />}
        </div>
      </section>
    </div>
  </>;
}

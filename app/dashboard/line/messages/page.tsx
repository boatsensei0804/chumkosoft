import { ArrowDown, ArrowRight, CircleAlert, CircleCheck, Filter, Gauge } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import PageHeader from "@/features/dashboard/components/page-header";
import RetryMessageButton from "@/features/line/components/retry-message-button";
import { getLineApiSummary } from "@/features/line/services/message-api-summary";
import { requireRoles } from "@/lib/dal";

export const dynamic = "force-dynamic";
export const metadata = { title: "ประวัติและโควตา LINE · chumkosoft" };

const messagesPath = "/dashboard/line/messages";
const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
const thaiDate = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" });
const thaiDateTime = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const numberFormat = new Intl.NumberFormat("th-TH");
const filterField = "h-11 w-full min-w-0 rounded-lg border border-line bg-card px-3 text-sm font-normal text-ink";

type MessageFilters = { kind?: string; status?: string; date?: string };

export default async function LineMessagesPage({ searchParams }: { searchParams: Promise<MessageFilters> }) {
  await requireRoles(["ADMIN"]);
  const filters = await searchParams;
  const summary = await getLineApiSummary(filters);
  const daily = new Map<string, { attendance: number; teacher: number; accepted: number; failed: number }>();

  for (const row of summary.byDay) {
    const day = dateKey.format(row.createdAt);
    const bucket = daily.get(day) ?? { attendance: 0, teacher: 0, accepted: 0, failed: 0 };
    if (row.kind === "ATTENDANCE") bucket.attendance++;
    if (row.kind === "TEACHER_DIGEST") bucket.teacher++;
    if (row.status === "ACCEPTED") bucket.accepted++;
    else bucket.failed++;
    daily.set(day, bucket);
  }

  const metrics = [
    { label: "ใช้โควตา LINE แล้ว", value: summary.used, detail: summary.quota === null ? "ข้อความ" : `จาก ${numberFormat.format(summary.quota)} ข้อความ`, icon: Gauge, tone: "bg-brand-soft text-brand-ink" },
    { label: "LINE รับคำขอเดือนนี้", value: summary.accepted, detail: "รายการ", icon: CircleCheck, tone: "bg-success-soft text-success" },
    { label: "ส่งไม่สำเร็จค้างอยู่", value: summary.failed, detail: "รายการ", icon: CircleAlert, tone: summary.failed > 0 ? "bg-danger-soft text-danger" : "bg-surface text-muted" },
  ];

  return (
    <>
      <PageHeader
        compact
        pose="working"
        title="ประวัติการแจ้งเตือน LINE"
        subtitle="ติดตามโควตา ตรวจผลการส่ง และจัดการรายการที่ส่งไม่สำเร็จ"
        actions={<Button asChild variant="outline"><Link href="/dashboard/line">กลับไปหน้าการแจ้งเตือน</Link></Button>}
      />

      <dl aria-label="สรุปการส่ง LINE" className="mb-4 grid divide-y divide-line overflow-hidden rounded-xl border border-line bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:px-5 sm:py-4">
            <span className={`grid size-8 place-items-center rounded-lg sm:row-span-2 sm:size-9 ${tone}`}><Icon className="size-[18px]" aria-hidden="true" /></span>
            <dt className="text-sm font-medium text-muted">{label}</dt>
            <dd className="flex min-w-0 max-w-32 flex-wrap items-baseline justify-end gap-x-2 text-right sm:max-w-none sm:justify-start sm:text-left">
              <span className="text-xl font-bold tracking-tight text-ink-strong tabular-nums sm:text-2xl">{value === null ? "—" : numberFormat.format(value)}</span>
              {value !== null && <span className="text-xs text-muted">{detail}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {summary.error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-warning-soft px-4 py-3 text-sm text-warning"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{summary.error}</p>}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <section id="delivery-history" aria-labelledby="delivery-history-heading" className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-line bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5 sm:px-5">
            <div>
              <h2 id="delivery-history-heading" className="text-lg font-bold text-ink-strong">ประวัติการส่งรายบัญชี</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">แสดงสูงสุด 100 รายการตามตัวกรอง · ใช้ Request ID อ้างอิงการรับคำขอจาก LINE API</p>
            </div>
            {summary.failed > 0 && filters.status !== "FAILED" && (
              <Button asChild variant="outline" className="h-11">
                <Link href={`${messagesPath}?status=FAILED#delivery-history`}><CircleAlert aria-hidden="true" />ดูที่ส่งไม่สำเร็จ</Link>
              </Button>
            )}
          </div>

          <form aria-label="กรองประวัติการส่ง" className="grid items-end gap-3 border-y border-line bg-surface/60 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_auto] sm:px-5" action={`${messagesPath}#delivery-history`}>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-strong">วันที่
              <input name="date" type="date" defaultValue={filters.date} className={filterField} />
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-strong">ประเภทข้อความ
              <select name="kind" defaultValue={filters.kind ?? ""} className={filterField}>
                <option value="">ทุกประเภท</option><option value="ATTENDANCE">แจ้งเข้าโรงเรียน</option><option value="TEACHER_DIGEST">สรุปครู</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-strong">สถานะ
              <select name="status" defaultValue={filters.status ?? ""} className={filterField}>
                <option value="">ทุกสถานะ</option><option value="ACCEPTED">LINE รับคำขอแล้ว</option><option value="FAILED">ส่งไม่สำเร็จ</option>
              </select>
            </label>
            <Button className="h-11"><Filter aria-hidden="true" />ใช้ตัวกรอง</Button>
          </form>

          {summary.recent.length ? (
            <ol className="divide-y divide-line">
              {summary.recent.map((row) => {
                const accepted = row.status === "ACCEPTED";
                const requestId = row.acceptedRequestId ?? row.requestId;
                return (
                  <li key={row.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-ink-strong">{row.title}</h3>
                      <p className="mt-1 break-words text-sm text-muted">
                        {row.recipientLabel ?? "บัญชี LINE"} · <time dateTime={row.createdAt.toISOString()}>{thaiDateTime.format(row.createdAt)}</time>
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        ลองส่ง {row.attempts} ครั้ง
                        {row.attempts > 1 && <> · ล่าสุด <time dateTime={row.updatedAt.toISOString()}>{thaiDateTime.format(row.updatedAt)}</time></>}
                        {!accepted && ` · ${row.errorCode ?? "ไม่ทราบสาเหตุ"}`}
                      </p>
                      {requestId && <p className="mt-1 break-all text-xs text-muted">Request ID {requestId}</p>}
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${accepted ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                        {accepted ? <CircleCheck className="size-3.5" aria-hidden="true" /> : <CircleAlert className="size-3.5" aria-hidden="true" />}
                        {accepted ? "LINE รับคำขอแล้ว" : "ส่งไม่สำเร็จ"}
                      </span>
                      {!accepted && <RetryMessageButton id={row.id} />}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <MascotEmptyState compact className="m-4" title="ไม่มีรายการที่ตรงกับตัวกรอง"
              action={(filters.date || filters.kind || filters.status) && <Button asChild variant="outline"><Link href={`${messagesPath}#delivery-history`}>ล้างตัวกรอง</Link></Button>} />
          )}
        </section>

        <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <section aria-labelledby="daily-delivery-heading" className="min-w-0 rounded-xl border border-line bg-card">
            <details className="group" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-4 marker:hidden focus-visible:outline-offset-[-3px] [&::-webkit-details-marker]:hidden">
                <h2 id="daily-delivery-heading" className="font-bold text-ink-strong">สรุปย้อนหลัง 30 วัน</h2>
                <ArrowDown aria-hidden="true" className="size-4 shrink-0 text-muted motion-safe:transition-transform group-open:rotate-180" />
              </summary>
              {daily.size ? (
                <div tabIndex={0} aria-label="รายการสรุปการส่งย้อนหลัง" role="region" className="max-h-80 overflow-auto border-t border-line focus-visible:outline-2 focus-visible:outline-brand">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-surface text-muted">
                      <tr>
                        {["วันที่", "เข้าเรียน", "สรุปครู", "รับแล้ว", "ล้มเหลว"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-2 py-2.5 font-semibold first:pl-4 last:pr-4">{label}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...daily.entries()].map(([day, count]) => (
                        <tr key={day}>
                          <th scope="row" className="whitespace-nowrap px-2 py-3 pl-4 font-medium text-ink"><time dateTime={day}>{thaiDate.format(new Date(`${day}T12:00:00+07:00`))}</time></th>
                          <td className="px-2 tabular-nums">{count.attendance}</td>
                          <td className="px-2 tabular-nums">{count.teacher}</td>
                          <td className="px-2 text-success tabular-nums">{count.accepted}</td>
                          <td className="px-2 pr-4 text-danger tabular-nums">{count.failed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="border-t border-line px-4 py-5 text-sm text-muted">ยังไม่มีประวัติส่งข้อความในช่วงนี้</p>}
            </details>
          </section>

          <section aria-labelledby="recent-announcements-heading" className="min-w-0 rounded-xl border border-line bg-card">
            <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-line px-4 py-2">
              <h2 id="recent-announcements-heading" className="py-2 font-bold text-ink-strong">ประกาศล่าสุด</h2>
              <Link href="/dashboard/line-announcements" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline">เปิดหน้าประกาศ <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
            {summary.announcements.length ? (
              <ul className="max-h-96 divide-y divide-line overflow-auto">
                {summary.announcements.map((row) => {
                  const accepted = row.batches.filter((item) => item.status === "ACCEPTED").reduce((total, item) => total + item.recipientCount, 0);
                  const failed = row.batches.filter((item) => item.status === "FAILED").reduce((total, item) => total + item.recipientCount, 0);
                  const errorCode = row.batches.find((item) => item.errorCode)?.errorCode;
                  return (
                    <li key={row.id} className="px-4 py-4">
                      <h3 className="break-words text-sm font-semibold text-ink-strong">{row.title}</h3>
                      <time className="mt-1 block text-xs text-muted" dateTime={row.createdAt.toISOString()}>{thaiDateTime.format(row.createdAt)}</time>
                      <p className="mt-2 text-xs text-muted"><span className="font-semibold text-success">LINE รับ {accepted}/{row.recipientCount}</span> · <span className={failed ? "font-semibold text-danger" : undefined}>ล้มเหลว {failed}</span></p>
                      {errorCode && <p className="mt-1 break-words text-xs text-danger">รหัสผิดพลาด {errorCode}</p>}
                      {failed > 0 && <Link href="/dashboard/line-announcements" className="inline-flex min-h-10 items-center text-xs font-semibold text-brand-ink hover:underline">เปิดรายการเพื่อส่งต่อ</Link>}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="px-4 py-5 text-sm text-muted">ยังไม่มีประวัติประกาศ</p>}
          </section>
        </div>
      </div>
    </>
  );
}

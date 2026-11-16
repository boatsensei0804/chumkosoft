import { requireRoles } from "@/lib/dal";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import RetryMessageButton from "@/features/line/components/retry-message-button";
import { getLineApiSummary } from "@/features/line/services/message-api-summary";
import { MessagesSquare, CircleCheck, CircleAlert } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ประวัติและโควตา LINE · chumkosoft" };
export default async function LineMessagesPage() {
  await requireRoles(["ADMIN"]);
  const summary = await getLineApiSummary();
  return <><PageHeader title="ประวัติและการใช้งาน LINE API" subtitle="ตรวจยอดใช้โควตาและส่งซ้ำเฉพาะรายการแจ้งเข้าเรียนที่ส่งไม่สำเร็จ" />
    <StatStrip items={[
      { label: "ใช้แล้วตาม LINE API", value: summary.used ?? "—", hint: summary.quota ? `/ ${summary.quota}` : "ข้อความ", icon: MessagesSquare, tone: "brand" },
      { label: "ส่งสำเร็จในระบบเดือนนี้", value: summary.accepted ?? "—", hint: "รายการข้อความ", icon: CircleCheck, tone: "success" },
      { label: "ส่งไม่สำเร็จค้างอยู่", value: summary.failed ?? "—", hint: "รายการ", icon: CircleAlert, tone: "warning" },
    ]} />
    {summary.error && <p role="status" className="my-4 rounded-xl bg-amber-50 p-4 text-sm">{summary.error}</p>}
    <p className="my-4 text-sm text-muted">ยอดใช้จาก LINE เป็นยอดรวมตามรอบโควตาของบัญชี อาจไม่ตรงกับจำนวนรายการในระบบทุกประการ การกดส่งซ้ำจะนับโควตาเพิ่ม</p>
    <section className="rounded-2xl border bg-white"><h2 className="border-b p-4 font-bold">รายการแจ้งเข้าเรียนที่ส่งไม่สำเร็จ</h2><div className="divide-y">{summary.failedRecent?.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{row.title}</p><p className="mt-1 text-sm text-muted">{row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · รหัส {row.errorCode ?? "ไม่ทราบสาเหตุ"}</p><p className="mt-1 text-sm">{row.body}</p></div><RetryMessageButton id={row.id} /></article>)}{!summary.failedRecent?.length && <p className="p-8 text-center text-sm text-muted">ไม่มีรายการล้มเหลว</p>}</div></section>
  </>;
}

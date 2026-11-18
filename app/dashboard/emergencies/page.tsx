import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { acknowledgeEmergencyAction, resolveEmergencyAction } from "@/features/faces/emergency-actions";
import RetryEmergencyMessageButton from "@/features/faces/components/retry-emergency-message-button";
import { getLineDeliveryState } from "@/features/line/services/line-delivery-settings";

export const metadata: Metadata = { title: "แจ้งเหตุฉุกเฉิน · chumkosoft" };
export const dynamic = "force-dynamic";

const STATUS = {
  OPEN: { label: "รอรับเรื่อง", color: "bg-danger-soft text-danger" },
  ACKNOWLEDGED: { label: "รับเรื่องแล้ว", color: "bg-warning-soft text-warning" },
  RESOLVED: { label: "ดำเนินการแล้ว", color: "bg-success-soft text-success" },
} as const;

export default async function EmergencyIncidentsPage(): Promise<React.ReactNode> {
  await requireRoles(["ADMIN", "TEACHER"]);
  const [incidents, lineDelivery] = await Promise.all([prisma.emergencyIncident.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      acknowledgedBy: { select: { email: true } },
      resolvedBy: { select: { email: true } },
      lineMessages: { where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, select: { id: true, recipientLabel: true, errorCode: true, attempts: true, createdAt: true } },
    },
  }), getLineDeliveryState()]);

  return <>
    <PageHeader title="แจ้งเหตุฉุกเฉิน" subtitle="เหตุจากแอปจุดสแกน · ติดตามการรับเรื่องและสถานะการแจ้งทีมงาน" />
    <div className="space-y-4">
      <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4 text-sm text-ink">
        <p className="font-bold text-danger">การแจ้งเหตุจากแอปจะส่ง LINE ถึงแอดมินและครู/บุคลากรที่เชื่อมบัญชีไว้เท่านั้น</p>
        <p className="mt-1 text-muted">ถ้าไม่มีผู้รับ LINE หรือระบบออฟไลน์ ให้ใช้ช่องทางโทรศัพท์ฉุกเฉินของโรงเรียน/หน่วยงานทันที</p>
        {!lineDelivery.available || !lineDelivery.enabled ? <p className="mt-2 font-semibold text-danger">ขณะนี้ระบบพักการส่ง LINE อยู่ เหตุใหม่จะถูกบันทึกในเว็บแต่ LINE จะไม่ถูกส่ง กรุณาเปิดการส่งหรือใช้ช่องทางโทรศัพท์</p> : null}
      </div>
      {incidents.length ? incidents.map((incident) => <article key={incident.id} className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-ink-strong">🚨 {incident.category}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[incident.status].color}`}>{STATUS[incident.status].label}</span>
            </div>
            <p className="mt-1 text-sm text-muted">จุดแจ้งเหตุ: {incident.deviceNameSnapshot}</p>
            <time className="mt-1 block text-xs text-muted" dateTime={incident.createdAt.toISOString()}>
              {new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(incident.createdAt)} น.
            </time>
          </div>
          {incident.status !== "RESOLVED" && <div className="flex flex-wrap gap-2">
            {incident.status === "OPEN" && <form action={acknowledgeEmergencyAction.bind(null, incident.id)}><button className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink-strong">รับเรื่อง</button></form>}
            <form action={resolveEmergencyAction.bind(null, incident.id)}><button className="min-h-10 rounded-xl bg-brand px-3 text-sm font-semibold text-white">ปิดเหตุ</button></form>
          </div>}
        </div>
        {incident.detail && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm text-ink">{incident.detail}</p>}
        {incident.lineMessages.length > 0 && <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft/40 p-3">
          <p className="mb-2 text-sm font-semibold text-danger">LINE ส่งไม่สำเร็จ {incident.lineMessages.length} บัญชี · กดส่งซ้ำรายบัญชีได้</p>
          <div className="space-y-2">{incident.lineMessages.map((message) => <div key={message.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2">
            <span className="text-sm text-ink">{message.recipientLabel ?? "บัญชี LINE"} · {message.errorCode ?? "ไม่ทราบสาเหตุ"} · ลองแล้ว {message.attempts} ครั้ง</span>
            <RetryEmergencyMessageButton id={message.id} />
          </div>)}</div>
        </div>}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-xs text-muted">
          <span>LINE เป้าหมาย {incident.lineTargetCount} บัญชี</span>
          <span className="text-success">LINE รับคำขอ {incident.lineAcceptedCount}</span>
          {incident.lineFailedCount > 0 && <span className="text-danger">ส่งไม่สำเร็จ {incident.lineFailedCount}</span>}
          {incident.lineTargetCount === 0 && <span className="text-danger">ยังไม่มีบัญชี LINE แอดมิน/ครูที่เชื่อมไว้</span>}
          {incident.status === "ACKNOWLEDGED" && incident.acknowledgedBy && <span>รับเรื่องโดย {incident.acknowledgedBy.email}</span>}
          {incident.status === "RESOLVED" && incident.resolvedBy && <span>ปิดเหตุโดย {incident.resolvedBy.email}</span>}
        </div>
      </article>) : <div className="rounded-2xl border border-line bg-card px-5 py-14 text-center text-sm text-muted">ยังไม่มีรายการแจ้งเหตุจากจุดสแกน</div>}
    </div>
  </>;
}

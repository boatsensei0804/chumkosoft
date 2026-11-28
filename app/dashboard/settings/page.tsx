import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import SectionCard from "@/features/dashboard/components/section-card";
import EditorDialog from "@/features/dashboard/components/editor-dialog";
import LineDeliveryPanel from "@/features/line/components/line-delivery-panel";
import AcademicSettings from "@/features/settings/components/academic-settings";
import AdvisorDigestTime from "@/features/settings/components/advisor-digest-time";
import PeriodSettings from "@/features/settings/components/period-settings";
import { getAcademicSettings, getPeriodSettings } from "@/features/settings/services/settings-service";
import { requireRoles } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";
import SemanticStatusBadge from "@/components/ui/semantic-status-badge";

export const metadata: Metadata = { title: "ตั้งค่าระบบ · chumkosoft" };
export const dynamic = "force-dynamic";

const sections = [
  { id: "academic", label: "ปีการศึกษาและคาบเรียน", icon: CalendarDays },
  { id: "notifications", label: "การแจ้งเตือน LINE", icon: Bell },
  { id: "administration", label: "บัญชี ถังขยะ และอุปกรณ์", icon: ShieldCheck },
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireRoles(["ADMIN"]);
  const { section } = await searchParams;
  const selected = sections.find(({ id }) => id === section)?.id ?? "academic";

  return (
    <>
      <PageHeader pose="settings" title="ตั้งค่าระบบ" subtitle="จัดการภาคเรียน ตารางเวลา การแจ้งเตือน และบัญชีของโรงเรียน" />
      <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="หมวดตั้งค่าระบบ" className="grid gap-1 rounded-xl border border-line bg-card p-2">
        {sections.map(({ id, label, icon: Icon }) => (
          <Link key={id} href={id === "academic" ? "/dashboard/settings" : "/dashboard/settings?section=" + id}
            aria-current={selected === id ? "page" : undefined}
            className={cn("flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand",
              selected === id ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-card hover:text-ink")}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        ))}
        </nav>
        <div className="min-w-0">
        {selected === "academic" && <AcademicSection />}
        {selected === "notifications" && <NotificationSection />}
        {selected === "administration" && <AdministrationSection />}
        </div>
      </div>
    </>
  );
}

async function AcademicSection() {
  const [years, periods] = await Promise.all([getAcademicSettings(), getPeriodSettings()]);

  return (
    <div className="grid items-start gap-5 2xl:grid-cols-2">
      <AcademicSettings years={years} />
      <SectionCard
        title="เวลาคาบเรียน"
        caption="ใช้กับตารางสอนและการเช็คชื่อรายคาบ"
        action={<EditorDialog title="จัดการคาบเรียน" description="เพิ่ม แก้ไข เรียงลำดับ หรือลบคาบ แล้วกดบันทึก" label="จัดการคาบเรียน">
          <PeriodSettings initialPeriods={periods} />
        </EditorDialog>}
        bodyClassName="p-0"
      >
        {periods.length > 0 ? <ul className="divide-y divide-line">
          {periods.map((period) => (
            <li key={period.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
              <span className={period.isBreak ? "text-muted" : "font-medium text-ink"}>{period.label}</span>
              <span className="shrink-0 tabular text-muted">{period.startTime}–{period.endTime}</span>
            </li>
          ))}
        </ul> : <p className="px-4 py-5 text-sm text-muted sm:px-5">ยังไม่มีคาบเรียน กดจัดการคาบเรียนเพื่อเพิ่มคาบแรก</p>}
      </SectionCard>
    </div>
  );
}

async function NotificationSection() {
  const kinds = [
    { kind: "TEACHER_DIGEST", label: "สรุปให้ครูที่ปรึกษา" },
    { kind: "ATTENDANCE", label: "แจ้งการเข้าโรงเรียน" },
  ] as const;
  const [digest, deliveries] = await Promise.all([
    prisma.advisorDigestSetting.findUnique({ where: { id: 1 }, select: { sendTime: true, oaAddFriendUrl: true } }),
    Promise.all(kinds.map(async ({ kind, label }) => {
      const where = { kind, status: { in: ["ACCEPTED", "FAILED"] as ("ACCEPTED" | "FAILED")[] } };
      const [latest, failed] = await Promise.all([
        prisma.lineOutboundMessage.findFirst({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true, status: true } }),
        prisma.lineOutboundMessage.count({ where: { kind, status: "FAILED" } }),
      ]);
      return { kind, label, latest, failed };
    })),
  ]);
  const timestamp = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  const sendTime = digest?.sendTime ?? "09:00";

  return (
    <div className="space-y-4">
      <LineDeliveryPanel canManage={true} />
      <section aria-labelledby="line-schedule-status" className="overflow-hidden rounded-xl border border-line bg-card">
        <h2 id="line-schedule-status" className="border-b border-line bg-surface px-4 py-3 font-bold text-ink-strong">เวลาส่งและผลล่าสุด</h2>
        <ul className="divide-y divide-line">
          {deliveries.map(({ kind, label, latest, failed }) => (
            <li key={kind} className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] xl:items-center">
              <div><p className="font-semibold text-ink">{label}</p><p className="mt-1 text-sm text-muted">{kind === "TEACHER_DIGEST" ? `จันทร์–ศุกร์ · ตั้งไว้ ${sendTime} น.` : "หลังบันทึกเข้าโรงเรียน · ถึงบัญชีที่เชื่อมไว้"}</p></div>
              <div>
                <SemanticStatusBadge tone={latest?.status === "ACCEPTED" ? "success" : latest ? "danger" : "neutral"}>
                  {latest?.status === "ACCEPTED" ? "LINE รับคำขอแล้ว" : latest ? "ส่งไม่สำเร็จ" : "ยังไม่มีประวัติ"}
                </SemanticStatusBadge>
                {latest && <p className="mt-1 text-xs text-muted">ผลล่าสุด {timestamp.format(latest.updatedAt)}</p>}
              </div>
              <Button asChild variant="outline" className="min-h-11 w-fit">
                <Link href={`/dashboard/line/messages?${new URLSearchParams({ kind, ...(failed ? { status: "FAILED" } : {}) })}#delivery-history`}>
                  {failed ? `ตรวจที่ส่งไม่สำเร็จ ${failed} รายการ` : "ดูประวัติการส่ง"} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <AdvisorDigestTime initialTime={sendTime} initialFriendUrl={digest?.oaAddFriendUrl ?? ""} />
    </div>
  );
}

const administrationLinks = [
  { href: "/dashboard/settings/records", label: "บัญชีแอดมิน", description: "เพิ่มบัญชีผู้ดูแลหรือเปลี่ยนสถานะบัญชี" },
  { href: "/dashboard/settings/records?view=trash", label: "ถังขยะ", description: "ตรวจรายการที่ถูกลบและจัดการลบถาวร" },
  { href: "/dashboard/kiosk", label: "จุดสแกนใบหน้า", description: "จัดการเครื่องสแกน บัญชีจุดสแกน และเวลาเข้าโรงเรียน" },
  { href: "/dashboard/kiosk#zkteco-networks", label: "เครือข่ายที่อนุญาต", description: "เพิ่มหรือลบ Public IP ของเครื่อง ZKTeco" },
];

function AdministrationSection() {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-card">
      {administrationLinks.map(({ href, label, description }) => (
        <li key={href}>
          <Link href={href} className="flex items-center gap-4 px-4 py-4 hover:bg-school-panel-tint sm:px-5">
            <div className="flex-1"><p className="font-semibold text-ink-strong">{label}</p><p className="mt-1 text-sm text-muted">{description}</p></div>
            <ArrowRight className="size-4 shrink-0 text-brand-ink" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

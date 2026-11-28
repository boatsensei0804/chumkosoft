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
      <nav aria-label="หมวดตั้งค่าระบบ" className="mb-5 flex flex-wrap gap-2 border-b border-line pb-3">
        {sections.map(({ id, label, icon: Icon }) => (
          <Link key={id} href={id === "academic" ? "/dashboard/settings" : "/dashboard/settings?section=" + id}
            aria-current={selected === id ? "page" : undefined}
            className={cn("flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
              selected === id ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-card hover:text-ink")}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      {selected === "academic" && <AcademicSection />}
      {selected === "notifications" && <NotificationSection />}
      {selected === "administration" && <AdministrationSection />}
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
  const digest = await prisma.advisorDigestSetting.findUnique({ where: { id: 1 }, select: { sendTime: true, oaAddFriendUrl: true } });

  return (
    <div className="max-w-5xl space-y-5">
      <LineDeliveryPanel canManage={true} />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <AdvisorDigestTime initialTime={digest?.sendTime ?? "09:00"} initialFriendUrl={digest?.oaAddFriendUrl ?? ""} />
        <SectionCard title="แจ้งเวลาเข้าโรงเรียนให้นักเรียนและผู้ปกครอง"
          action={<Button asChild variant="outline" size="sm"><Link href="/dashboard/line/messages">ดูประวัติการส่ง</Link></Button>}>
          <p className="text-sm leading-relaxed text-muted">ระบบส่งหลังบันทึกสแกนเข้าโรงเรียนสำเร็จ ถึงบัญชี LINE ที่ผูกกับนักเรียน</p>
        </SectionCard>
      </div>
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
    <ul className="max-w-3xl divide-y divide-line rounded-xl border border-line bg-card">
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

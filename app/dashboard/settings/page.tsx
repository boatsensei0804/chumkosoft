import Link from "next/link";
import LineDeliveryPanel from "@/features/line/components/line-delivery-panel";
import type { Metadata } from "next";
import { CalendarDays, CalendarRange, Clock } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import WorkspacePanels from "@/features/dashboard/components/workspace-panels";
import EditorDialog from "@/features/dashboard/components/editor-dialog";
import AcademicSettings from "@/features/settings/components/academic-settings";
import PeriodSettings from "@/features/settings/components/period-settings";
import AdvisorDigestTime from "@/features/settings/components/advisor-digest-time";
import { requireRoles } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { getAcademicSettings, getPeriodSettings } from "@/features/settings/services/settings-service";

export const metadata: Metadata = {
  title: "ตั้งค่าระบบ · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage(): Promise<React.ReactNode> {
  // System configuration is an ADMIN-only surface.
  await requireRoles(["ADMIN"]);
  const [years, periods, digestSetting] = await Promise.all([
    getAcademicSettings(),
    getPeriodSettings(),
    prisma.advisorDigestSetting.findUnique({ where: { id: 1 }, select: { sendTime: true, oaAddFriendUrl: true } }),
  ]);
  const termCount = years.reduce((sum, y) => sum + y.terms.length, 0);
  const classPeriods = periods.filter((p) => !p.isBreak).length;

  return (
    <>
      <PageHeader
        title="ตั้งค่าระบบ"
        subtitle="กำหนดปีการศึกษา ภาคเรียน คาบเรียน และเวลาแจ้งเตือน LINE"
      />
      <StatStrip
        items={[
          { label: "ปีการศึกษา", value: years.length, hint: "ปี", icon: CalendarDays, tone: "brand" },
          { label: "ภาคเรียน", value: termCount, hint: "ภาคเรียน", icon: CalendarRange, tone: "default" },
          { label: "คาบเรียน", value: classPeriods, hint: "คาบ/วัน", icon: Clock, tone: "default" },
        ]}
      />
      <WorkspacePanels sections={[
        { title: "ปีการศึกษาและภาคเรียน", description: "กำหนดภาคเรียนที่ข้อมูลทั้งระบบอ้างอิง", content: <AcademicSettings years={years} /> },
        { title: "โครงเวลาคาบเรียน", description: "ตรวจช่วงเวลาเรียนและพักในแต่ละวัน", content: <section className="rounded-[22px] border border-line bg-white p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">ตารางเวลาประจำวัน</h2><p className="mt-1 text-sm text-muted">ใช้กับตารางสอนและการเช็คชื่อรายวิชา</p></div><EditorDialog title="จัดการคาบเรียน" description="เพิ่ม แก้ไข เรียงลำดับ หรือลบคาบ จากนั้นกดบันทึก" label="จัดการคาบเรียน"><PeriodSettings initialPeriods={periods} /></EditorDialog></div><ol className="max-h-[50dvh] space-y-2 overflow-y-auto">{periods.map((period, index) => <li key={period.id} className={`flex flex-wrap items-center gap-3 rounded-xl p-4 ${period.isBreak ? "bg-slate-100" : "bg-blue-50"}`}><span className="grid size-8 place-items-center rounded-full bg-white text-xs font-semibold text-brand-ink">{index + 1}</span><span className="flex-1 text-sm font-semibold">{period.label}</span><span className="text-sm tabular text-muted">{period.startTime}–{period.endTime}</span><span className="rounded-full bg-white px-2 py-1 text-xs text-muted">{period.isBreak ? "พัก" : "คาบเรียน"}</span></li>)}</ol>{periods.length === 0 && <MascotEmptyState compact pose="schedule" title="ยังไม่มีคาบเรียน" description="กดจัดการคาบเรียนเพื่อเริ่มต้น" />}</section> },
        { title: "LINE และการส่งสรุป", description: "เวลาแจ้งครูและลิงก์เพิ่มเพื่อนโรงเรียน", content: <><LineDeliveryPanel canManage={true} /><AdvisorDigestTime initialTime={digestSetting?.sendTime ?? "09:00"} initialFriendUrl={digestSetting?.oaAddFriendUrl ?? ""} /></> },
        { title: "จุดและอุปกรณ์สแกน", description: "เปิดหน้าจัดการบัญชี จุดสแกน และสถานะเครื่อง", content: <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-4">
          <Link href="/dashboard/kiosk" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white">ตั้งค่าจุดสแกน</Link>
          <Link href="/scanner-devices" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold text-brand-ink">ดูสถานะเครื่อง</Link>
        </div> },
      ]} />
    </>
  );
}

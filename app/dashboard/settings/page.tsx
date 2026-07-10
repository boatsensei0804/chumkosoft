import type { Metadata } from "next";
import { CalendarDays, CalendarRange, Clock } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import SettingsTabs from "@/features/settings/components/settings-tabs";
import { requireRoles } from "@/lib/dal";
import { getAcademicSettings, getPeriodSettings } from "@/features/settings/services/settings-service";

export const metadata: Metadata = {
  title: "ตั้งค่าระบบ · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage(): Promise<React.ReactNode> {
  // System configuration is an ADMIN-only surface.
  await requireRoles(["ADMIN"]);
  const [years, periods] = await Promise.all([getAcademicSettings(), getPeriodSettings()]);
  const termCount = years.reduce((sum, y) => sum + y.terms.length, 0);
  const classPeriods = periods.filter((p) => !p.isBreak).length;

  return (
    <>
      <PageHeader
        title="ตั้งค่าระบบ"
        subtitle="กำหนดปีการศึกษา ภาคเรียน และโครงเวลาคาบเรียนของสถานศึกษา"
      />
      <StatStrip
        items={[
          { label: "ปีการศึกษา", value: years.length, hint: "ปี", icon: CalendarDays, tone: "brand" },
          { label: "ภาคเรียน", value: termCount, hint: "ภาคเรียน", icon: CalendarRange, tone: "default" },
          { label: "คาบเรียน", value: classPeriods, hint: "คาบ/วัน", icon: Clock, tone: "default" },
        ]}
      />
      <SettingsTabs years={years} periods={periods} />
    </>
  );
}

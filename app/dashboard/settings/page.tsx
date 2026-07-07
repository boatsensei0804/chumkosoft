import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
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
  return (
    <>
      <PageHeader
        title="ตั้งค่าระบบ"
        subtitle="กำหนดปีการศึกษา ภาคเรียน และโครงเวลาคาบเรียนของสถานศึกษา"
      />
      <SettingsTabs years={years} periods={periods} />
    </>
  );
}

import type { Metadata } from "next";
import { School, UserCheck, TriangleAlert } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import ClassroomsBrowser from "@/features/classrooms/components/classrooms-browser";
import { listClassrooms, listTeacherOptions } from "@/features/classrooms/services/classroom-service";

export const metadata: Metadata = {
  title: "ห้องเรียน · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function ClassroomsPage(): Promise<React.ReactNode> {
  const [classrooms, teachers] = await Promise.all([listClassrooms(), listTeacherOptions()]);
  const withAdvisor = classrooms.filter((c) => c.advisors.length > 0).length;

  return (
    <>
      <PageHeader
        title="ห้องเรียน"
        subtitle={`ห้องเรียนและครูที่ปรึกษา ${classrooms.length.toLocaleString("th-TH")} ห้อง · ปีการศึกษาปัจจุบัน`}
      />
      <StatStrip
        items={[
          { label: "ห้องเรียนทั้งหมด", value: classrooms.length, hint: "ห้อง", icon: School, tone: "brand" },
          { label: "มีครูที่ปรึกษา", value: withAdvisor, hint: "ห้อง", icon: UserCheck, tone: "success" },
          { label: "ยังไม่กำหนดครู", value: classrooms.length - withAdvisor, hint: "ห้อง", icon: TriangleAlert, tone: "warning" },
        ]}
      />
      <ClassroomsBrowser classrooms={classrooms} teachers={teachers} />
    </>
  );
}

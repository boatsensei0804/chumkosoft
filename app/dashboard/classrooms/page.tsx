import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import ClassroomsBrowser from "@/features/classrooms/components/classrooms-browser";
import { listClassrooms, listTeacherOptions } from "@/features/classrooms/services/classroom-service";

export const metadata: Metadata = {
  title: "ห้องเรียน · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function ClassroomsPage(): Promise<React.ReactNode> {
  const [classrooms, teachers] = await Promise.all([listClassrooms(), listTeacherOptions()]);

  return (
    <>
      <PageHeader
        title="ห้องเรียน"
        subtitle={`ห้องเรียนและครูที่ปรึกษา ${classrooms.length.toLocaleString("th-TH")} ห้อง · ปีการศึกษาปัจจุบัน`}
      />
      <ClassroomsBrowser classrooms={classrooms} teachers={teachers} />
    </>
  );
}

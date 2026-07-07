import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import TimetableBuilder from "@/features/timetable/components/timetable-builder";
import { getTimetableBoard } from "@/services/timetable-service";
import { listOfferingOptions } from "@/features/classrooms/services/classroom-service";

export const metadata: Metadata = {
  title: "จัดตารางสอน · chumkosoft",
};

export const dynamic = "force-dynamic";

interface TimetablePageProps {
  searchParams: Promise<{ term?: string; classroom?: string }>;
}

export default async function TimetablePage({ searchParams }: TimetablePageProps): Promise<React.ReactNode> {
  const { term, classroom } = await searchParams;
  const [board, offeringOptions] = await Promise.all([
    getTimetableBoard({ termId: term, classroomId: classroom }),
    listOfferingOptions(),
  ]);
  return (
    <>
      <PageHeader
        title="จัดตารางสอน"
        subtitle="เลือกภาคเรียนและชั้นเรียน มอบหมายวิชาให้ครู แล้วลากวิชาลงในตารางรายสัปดาห์ ระบบจะป้องกันการจัดคาบชนของครู ห้อง และชั้นเรียนให้อัตโนมัติ และบันทึกลงฐานข้อมูลทันที"
      />
      <TimetableBuilder
        key={`${board.context?.termId ?? "none"}:${board.context?.classroomId ?? "none"}`}
        context={board.context}
        terms={board.terms}
        classrooms={board.classrooms}
        offeringOptions={offeringOptions}
        days={board.days}
        periods={board.periods}
        offerings={board.offerings}
        initialSlots={board.slots}
        externalBusy={board.externalBusy}
      />
    </>
  );
}

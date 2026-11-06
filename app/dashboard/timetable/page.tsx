import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import TimetableWorkspace from "@/features/timetable/components/timetable-workspace";
import { getTimetableBoard, getTimetableOverview } from "@/services/timetable-service";
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
  const overview = board.context
    ? await getTimetableOverview(board.context.termId, board.context.academicYearId)
    : { classrooms: [], teachers: [], slots: [], offerings: [], requiredPeriods: 0, placedPeriods: 0 };
  return (
    <>
      <PageHeader
        title="จัดตารางสอน"
        subtitle="ดูภาพรวมคาบเรียนแยกตามห้องและวัน เปิดตารางรายห้องหรือรายครู แล้วสลับไปจัดหรือแก้คาบสอนได้จากหน้าเดียว"
      />
      <TimetableWorkspace
        key={`${board.context?.termId ?? "none"}:${board.context?.classroomId ?? "none"}`}
        context={board.context}
        terms={board.terms}
        classrooms={board.classrooms}
        offeringOptions={offeringOptions}
        days={board.days}
        periods={board.periods}
        offerings={board.offerings}
        externalBusy={board.externalBusy}
        overview={overview}
      />
    </>
  );
}

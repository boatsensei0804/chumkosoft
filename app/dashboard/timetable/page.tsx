import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import TimetableWorkspace from "@/features/timetable/components/timetable-workspace";
import { getTimetableBoard, getTimetableOverview } from "@/services/timetable-service";
import { listOfferingOptions } from "@/features/classrooms/services/classroom-service";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = {
  title: "จัดตารางสอน · chumkosoft",
};

export const dynamic = "force-dynamic";

interface TimetablePageProps {
  searchParams: Promise<{ term?: string; classroom?: string; view?: string }>;
}

export default async function TimetablePage({ searchParams }: TimetablePageProps): Promise<React.ReactNode> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const { term, classroom, view } = await searchParams;
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
        initialView={user.role === "ADMIN" && view === "edit" ? "edit" : "overview"}
        canManage={user.role === "ADMIN"}
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

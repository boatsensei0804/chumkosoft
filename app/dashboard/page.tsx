import type { Metadata } from "next";
import Button from "@mui/material/Button";
import WelcomeBand from "@/features/dashboard/components/welcome-band";
import SummaryFigures from "@/features/dashboard/components/summary-figures";
import EnrolmentTrend from "@/features/dashboard/components/enrolment-trend";
import TodaySchedule from "@/features/dashboard/components/today-schedule";
import Announcements from "@/features/dashboard/components/announcements";
import SectionCard from "@/features/dashboard/components/section-card";
import StudentsTable from "@/features/dashboard/components/students-table";
import Icon from "@/features/dashboard/components/icon";
import {
  getSummaryFigures,
  getTodaySchedule,
  getActiveTermLabel,
  getEnrolmentTrend,
  listAnnouncements,
} from "@/services/dashboard-service";
import { listStudentSummaries } from "@/services/student-service";
import { getCurrentUser } from "@/lib/dal";
import { thaiGreeting, formatThaiWeekdayLong } from "@/utils/thai-date";

export const metadata: Metadata = {
  title: "ภาพรวม · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage(): Promise<React.ReactNode> {
  const now = new Date();
  const [figures, recentStudents, todaySchedule, termLabel, user, enrolmentTrend, announcements] = await Promise.all([
    getSummaryFigures(),
    listStudentSummaries(6),
    getTodaySchedule(),
    getActiveTermLabel(),
    getCurrentUser(),
    getEnrolmentTrend(),
    listAnnouncements(5),
  ]);
  const greeting = user.firstName ? `${thaiGreeting(now)} คุณ${user.firstName}` : thaiGreeting(now);
  return (
    <>
      <div className="flex flex-col gap-5">
        <WelcomeBand
          greeting={greeting}
          subtitle="ภาพรวมการดำเนินงานของโรงเรียนประจำวันนี้ ตรวจสอบรายการค้างอนุมัติได้ที่ด้านล่าง"
          term={termLabel}
          date={formatThaiWeekdayLong(now)}
        />
        <SummaryFigures figures={figures} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="flex flex-col gap-5">
            <EnrolmentTrend data={enrolmentTrend} />
            <SectionCard
              title="นักเรียนที่ลงทะเบียนล่าสุด"
              caption="6 รายการล่าสุด"
              action={
                <Button
                  variant="text"
                  endIcon={<Icon name="arrow_forward" sx={{ fontSize: 17 }} />}
                  sx={{ color: "var(--brand-ink)", fontSize: 13 }}
                >
                  ดูทั้งหมด
                </Button>
              }
              bodyClassName="p-0"
            >
              <StudentsTable students={recentStudents} />
            </SectionCard>
          </div>

          <div className="flex flex-col gap-5">
            <TodaySchedule
              items={todaySchedule.items}
              weekdayLabel={todaySchedule.weekdayLabel}
              classroomCode={todaySchedule.classroomCode}
              isSchoolDay={todaySchedule.isSchoolDay}
            />
            <Announcements items={announcements} />
          </div>
        </div>
      </div>
    </>
  );
}

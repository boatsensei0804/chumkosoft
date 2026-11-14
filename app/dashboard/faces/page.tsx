import type { Metadata } from "next";
import { ScanFace, CircleCheck, CircleDashed } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import FacesViewTabs from "@/features/faces/components/faces-view-tabs";
import FacesBrowser from "@/features/faces/components/faces-browser";
import FacesRoomOverview from "@/features/faces/components/faces-room-overview";
import {
  listFaceStudents,
  getFaceStudentDetail,
  listClassroomFaceProgress,
  getFaceEnrollmentStats,
} from "@/features/faces/services/face-service";

export const metadata: Metadata = {
  title: "ชุดข้อมูลใบหน้า · chumkosoft",
};

export const dynamic = "force-dynamic";

interface FacesPageProps {
  searchParams: Promise<{ view?: string; student?: string }>;
}

export default async function FacesPage({ searchParams }: FacesPageProps): Promise<React.ReactNode> {
  const params = await searchParams;
  // A selected student implies the student view, so a link straight to ?student= works.
  const view = params.view === "rooms" && !params.student ? "rooms" : "students";

  const stats = await getFaceEnrollmentStats();
  const subtitle = `ข้อมูลสำหรับแอปสแกนเช็คชื่อ · ลงทะเบียนแล้ว ${stats.enrolledStudents.toLocaleString("th-TH")} จาก ${stats.totalStudents.toLocaleString("th-TH")} คน · ต้องได้รับความยินยอมจากผู้ปกครองก่อนเก็บข้อมูล`;

  return (
    <>
      <PageHeader title="ชุดข้อมูลใบหน้า" subtitle={subtitle} />

      <StatStrip
        items={[
          { label: "นักเรียนทั้งหมด", value: stats.totalStudents, hint: "คน", icon: ScanFace, tone: "brand" },
          { label: "มีข้อมูลใบหน้าแล้ว", value: stats.enrolledStudents, hint: "คน", icon: CircleCheck, tone: "success" },
          { label: "ยังไม่ลงทะเบียน", value: Math.max(0, stats.totalStudents - stats.enrolledStudents), hint: "คน", icon: CircleDashed, tone: "warning" },
        ]}
      />

      <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold text-ink-strong">ความพร้อมของข้อมูลใบหน้า</h2><span className="text-sm font-bold text-brand-ink">{stats.totalStudents ? Math.round(stats.enrolledStudents / stats.totalStudents * 100) : 0}% ลงทะเบียนแล้ว</span></div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-brand" style={{ width: `${stats.totalStudents ? stats.enrolledStudents / stats.totalStudents * 100 : 0}%` }} /></div>
        <p className="mt-3 text-xs leading-6 text-muted">จัดการภาพลงทะเบียนและข้อมูลนักเรียนที่นี่ ส่วนการสแกนเช็คชื่อใช้แอปสแกนใบหน้า ข้อมูลลงทะเบียนไม่ใช่สถานะยืนยันว่าแต่ละเครื่องซิงค์แล้ว</p>
      </section>
      <div className="flex flex-col gap-4">
        <FacesViewTabs view={view} />
        {view === "rooms" ? <RoomsView /> : <StudentsView selectedId={params.student} />}
      </div>
    </>
  );
}

async function StudentsView({ selectedId }: { selectedId?: string }): Promise<React.ReactNode> {
  const [students, selected] = await Promise.all([
    listFaceStudents(),
    selectedId ? getFaceStudentDetail(selectedId) : Promise.resolve(null),
  ]);
  return <FacesBrowser students={students} selected={selected} />;
}

async function RoomsView(): Promise<React.ReactNode> {
  const rooms = await listClassroomFaceProgress();
  return <FacesRoomOverview rooms={rooms} />;
}

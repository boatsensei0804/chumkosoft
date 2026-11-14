import type { ReactNode } from "react";
import Mascot, { type MascotPose } from "@/components/ui/mascot";

const sections: { match: string[]; pose: MascotPose; category: string; note: string }[] = [
  { match: ["นักเรียน"], pose: "students", category: "ทะเบียนนักเรียน", note: "ข้อมูลประจำตัว · ห้องเรียน · สถานะการศึกษา" },
  { match: ["ครู", "บุคลากร"], pose: "staff", category: "บุคลากรของโรงเรียน", note: "ประวัติบุคลากร · บัญชีใช้งาน · งานที่รับผิดชอบ" },
  { match: ["ผู้ปกครอง"], pose: "family", category: "โรงเรียนและครอบครัว", note: "ข้อมูลติดต่อ · ความสัมพันธ์ · การเชื่อมบัญชี" },
  { match: ["LINE", "ประกาศ"], pose: "notify", category: "ศูนย์การสื่อสาร", note: "สถานะการเชื่อม · รหัสบัญชี · ข่าวสารจากโรงเรียน" },
  { match: ["เช็คชื่อ", "ตาราง", "ลา"], pose: "schedule", category: "การเรียนและงานประจำวัน", note: "เลือกช่วงเวลา · ดูภาพรวม · เปิดรายละเอียดเพื่อจัดการ" },
  { match: ["ใบหน้า", "สแกน"], pose: "scan", category: "ระบบสแกนใบหน้า", note: "ข้อมูลสำหรับสแกน · อุปกรณ์ · การตั้งค่าจุดสแกน" },
  { match: ["รายวิชา", "ห้อง"], pose: "learning", category: "ข้อมูลการเรียนการสอน", note: "ข้อมูลพื้นฐาน · ความสัมพันธ์ · การนำไปใช้ในตารางเรียน" },
  { match: ["ตั้งค่า"], pose: "settings", category: "ตั้งค่าการทำงาน", note: "ปีการศึกษา · ภาคเรียน · เวลาและการทำงานของระบบ" },
];

export default function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }): ReactNode {
  const section = sections.find((item) => item.match.some((word) => title.includes(word))) ?? { pose: "working" as const, category: "พื้นที่ทำงานโรงเรียน", note: "ดูภาพรวมและจัดการข้อมูลในที่เดียว" };
  return <header className="relative mb-5 overflow-hidden rounded-[28px] border border-blue-100 bg-[#eaf5ff]">
    <div className="pointer-events-none absolute -right-8 -top-24 size-64 rounded-full border-[32px] border-white/50" aria-hidden="true" />
    <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
      <div className="min-w-0"><p className="mb-2 text-[11px] font-bold tracking-wide text-brand-ink">{section.category}</p><h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink-strong sm:text-[34px]">{title}</h1>{subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p>}</div>
      <Mascot pose={section.pose} size={132} decorative className="relative hidden md:block" />
    </div>
    <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-blue-100/80 bg-white/75 px-5 py-3 sm:px-7"><p className="text-xs leading-5 text-muted">{section.note}</p>{actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>}</div>
  </header>;
}

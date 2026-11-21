import type { ReactNode } from "react";
import MascotBanner from "./mascot-banner";
import type { MascotPose } from "@/components/ui/mascot";
import { Award, BookOpen, CalendarCheck2, CalendarX2, GraduationCap, LayoutDashboard, MapPin, Megaphone, MessageSquare, ScanFace, School, Settings, Siren, Users, UsersRound, type LucideIcon } from "lucide-react";

const sections: { match: string[]; pose: MascotPose; category: string; icon: LucideIcon; illustration?: string; scene?: string }[] = [
  { match: ["แจ้งเหตุฉุกเฉิน"], pose: "notify", category: "ศูนย์ประสานงานฉุกเฉิน", icon: Siren, scene: "/mascot/emergency-banner.webp" },
  { match: ["LINE ของฉัน"], pose: "notify", category: "การสื่อสารของฉัน", icon: MessageSquare, scene: "/mascot/my-line-banner.webp" },
  { match: ["LINE / แจ้งเตือนผู้ปกครอง"], pose: "notify", category: "ศูนย์การสื่อสาร", icon: MessageSquare, scene: "/mascot/communication-scene.webp" },
  { match: ["คำขอลา", "ขอมาสาย"], pose: "schedule", category: "คำขอจากครอบครัว", icon: CalendarX2, scene: "/mascot/schedule-scene.webp" },
  { match: ["ผู้ปกครอง"], pose: "family", category: "โรงเรียนและครอบครัว", icon: UsersRound, scene: "/mascot/guardians-banner.webp" },
  { match: ["ห้องและสถานที่"], pose: "settings", category: "พื้นที่ของโรงเรียน", icon: MapPin, scene: "/mascot/rooms-scene.webp" },
  { match: ["ห้องเรียน"], pose: "learning", category: "ข้อมูลการเรียนการสอน", icon: School, scene: "/mascot/classrooms-scene.webp" },
  { match: ["รายวิชา"], pose: "learning", category: "ข้อมูลการเรียนการสอน", icon: BookOpen, scene: "/mascot/courses-scene.webp" },
  { match: ["สถานะ LINE", "ประวัติและการใช้งาน LINE"], pose: "notify", category: "การสื่อสารและการแจ้งเตือน", icon: MessageSquare, scene: "/mascot/communication-scene.webp" },
  { match: ["คะแนนความประพฤติ"], pose: "success", category: "การดูแลนักเรียน", icon: Award, scene: "/mascot/students-scene.webp" },
  { match: ["นักเรียน"], pose: "students", category: "ทะเบียนนักเรียน", icon: GraduationCap, scene: "/mascot/students-scene.webp" },
  { match: ["ครู", "บุคลากร"], pose: "staff", category: "บุคลากรของโรงเรียน", icon: Users, scene: "/mascot/teachers-scene.webp" },
  { match: ["LINE", "ประกาศ"], pose: "notify", category: "ศูนย์การสื่อสาร", icon: Megaphone, scene: "/mascot/communication-scene.webp" },
  { match: ["เช็คชื่อ", "ตาราง", "ลา"], pose: "schedule", category: "การเรียนและงานประจำวัน", icon: CalendarCheck2, scene: "/mascot/schedule-scene.webp" },
  { match: ["ใบหน้า", "สแกน"], pose: "scan", category: "ระบบสแกนใบหน้า", icon: ScanFace, scene: "/mascot/communication-scene.webp" },
  { match: ["ตั้งค่า"], pose: "settings", category: "ตั้งค่าการทำงาน", icon: Settings, scene: "/mascot/settings-scene.webp" },
];

export default function PageHeader({ title, subtitle, actions, compact = false }: { title: string; subtitle?: string; actions?: ReactNode; compact?: boolean }): ReactNode {
  const section = sections.find((item) => item.match.some((word) => title.includes(word))) ?? { pose: "working" as const, category: "พื้นที่ทำงานโรงเรียน", icon: LayoutDashboard };
  return <MascotBanner title={title} subtitle={subtitle} actions={actions} compact={compact} {...section} />;
}

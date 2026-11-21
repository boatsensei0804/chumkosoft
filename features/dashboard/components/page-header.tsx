import type { ReactNode } from "react";
import MascotBanner from "./mascot-banner";
import type { MascotPose } from "@/components/ui/mascot";

const sections: { match: string[]; pose: MascotPose; category: string; illustration?: string; scene?: string }[] = [
  { match: ["แจ้งเหตุฉุกเฉิน"], pose: "notify", category: "ศูนย์ประสานงานฉุกเฉิน", scene: "/mascot/emergency-banner.webp" },
  { match: ["LINE ของฉัน"], pose: "notify", category: "การสื่อสารของฉัน", scene: "/mascot/my-line-banner.webp" },
  { match: ["LINE / แจ้งเตือนผู้ปกครอง"], pose: "notify", category: "ศูนย์การสื่อสาร" },
  { match: ["คำขอลา", "ขอมาสาย"], pose: "schedule", category: "คำขอจากครอบครัว" },
  { match: ["ผู้ปกครอง"], pose: "family", category: "โรงเรียนและครอบครัว", scene: "/mascot/guardians-banner.webp" },
  { match: ["ห้องและสถานที่"], pose: "settings", category: "พื้นที่ของโรงเรียน" },
  { match: ["สถานะ LINE", "ประวัติและการใช้งาน LINE"], pose: "notify", category: "การสื่อสารและการแจ้งเตือน" },
  { match: ["คะแนนความประพฤติ"], pose: "success", category: "การดูแลนักเรียน" },
  { match: ["นักเรียน"], pose: "students", category: "ทะเบียนนักเรียน" },
  { match: ["ครู", "บุคลากร"], pose: "staff", category: "บุคลากรของโรงเรียน" },
  { match: ["LINE", "ประกาศ"], pose: "notify", category: "ศูนย์การสื่อสาร" },
  { match: ["เช็คชื่อ", "ตาราง", "ลา"], pose: "schedule", category: "การเรียนและงานประจำวัน" },
  { match: ["ใบหน้า", "สแกน"], pose: "scan", category: "ระบบสแกนใบหน้า" },
  { match: ["รายวิชา", "ห้อง"], pose: "learning", category: "ข้อมูลการเรียนการสอน" },
  { match: ["ตั้งค่า"], pose: "settings", category: "ตั้งค่าการทำงาน" },
];

export default function PageHeader({ title, subtitle, actions, compact = false }: { title: string; subtitle?: string; actions?: ReactNode; compact?: boolean }): ReactNode {
  const section = sections.find((item) => item.match.some((word) => title.includes(word))) ?? { pose: "working" as const, category: "พื้นที่ทำงานโรงเรียน" };
  return <MascotBanner title={title} subtitle={subtitle} actions={actions} compact={compact} {...section} />;
}

import Image from "next/image";
import { cn } from "@/lib/utils";

export type MascotPose = "welcome" | "working" | "success" | "empty" | "error" | "access" | "notify" | "scan" | "students" | "staff" | "learning" | "schedule" | "family" | "settings";

const poseDescription: Record<MascotPose, string> = {
  welcome: "กระต่ายในถ้วยกาแฟกำลังต้อนรับ",
  working: "กระต่ายในถ้วยกาแฟกำลังทำงาน",
  success: "กระต่ายในถ้วยกาแฟแสดงความสำเร็จ",
  empty: "กระต่ายในถ้วยกาแฟรอข้อมูล",
  error: "กระต่ายในถ้วยกาแฟแจ้งข้อผิดพลาด",
  access: "กระต่ายในถ้วยกาแฟแจ้งเรื่องสิทธิ์เข้าถึง",
  notify: "กระต่ายในถ้วยกาแฟแจ้งข่าวสาร",
  scan: "กระต่ายในถ้วยกาแฟกำลังสแกน",
  students: "กระต่ายในถ้วยกาแฟกำลังดูทะเบียนนักเรียน",
  staff: "กระต่ายในถ้วยกาแฟกำลังดูข้อมูลครูและบุคลากร",
  learning: "กระต่ายในถ้วยกาแฟกำลังอ่านหนังสือเรียน",
  schedule: "กระต่ายในถ้วยกาแฟกำลังดูปฏิทินและตารางสอน",
  family: "กระต่ายในถ้วยกาแฟกำลังดูข้อมูลผู้ปกครอง",
  settings: "กระต่ายในถ้วยกาแฟกำลังตั้งค่าระบบโรงเรียน",
};

interface MascotProps {
  pose: MascotPose;
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
}

export default function Mascot({ pose, size = 160, className, decorative = false, priority = false }: MascotProps): React.ReactNode {
  return (
    <Image
      src={`/mascot/${pose}.png`}
      alt={decorative ? "" : poseDescription[pose]}
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

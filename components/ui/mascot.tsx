import Image from "next/image";
import { cn } from "@/lib/utils";

export type MascotPose = "welcome" | "working" | "success" | "empty" | "error" | "access" | "notify" | "scan" | "students" | "staff" | "learning" | "schedule" | "family" | "settings" | "conduct" | "checkout";

const poseDescription: Record<MascotPose, string> = {
  welcome: "กระต่ายในกระบอกข้าวหลามโบกมือต้อนรับ",
  working: "กระต่ายในกระบอกข้าวหลามถือคลิปบอร์ด",
  success: "กระต่ายในกระบอกข้าวหลามถือเครื่องหมายถูก",
  empty: "กระต่ายในกระบอกข้าวหลามโบกมือ",
  error: "กระต่ายในกระบอกข้าวหลามถือป้ายเตือน",
  access: "กระต่ายใส่แว่นในกระบอกข้าวหลามถือแม่กุญแจ",
  notify: "กระต่ายในกระบอกข้าวหลามถือโทรโข่ง",
  scan: "กระต่ายในกระบอกข้าวหลามถือจอแสดงกรอบสแกนใบหน้า",
  students: "กระต่ายในกระบอกข้าวหลามถือคลิปบอร์ดทะเบียนนักเรียน",
  staff: "กระต่ายในกระบอกข้าวหลามถือคลิปบอร์ดทะเบียนบุคลากร",
  learning: "กระต่ายในกระบอกข้าวหลามอ่านหนังสือ",
  schedule: "กระต่ายในกระบอกข้าวหลามถือคลิปบอร์ดเช็คชื่อ",
  family: "กระต่ายในกระบอกข้าวหลามถือสัญลักษณ์ข้อความ",
  settings: "กระต่ายในกระบอกข้าวหลามหมุนเฟืองตั้งค่า",
  conduct: "กระต่ายในกระบอกข้าวหลามจดคะแนนลงสมุด",
  checkout: "กระต่ายในกระบอกข้าวหลามสะพายกระเป๋าเตรียมกลับบ้าน",
};

const poseArtwork: Partial<Record<MascotPose, string>> = {
  notify: "announcement.webp",
  conduct: "conduct.webp",
  checkout: "checkout.webp",
  settings: "settings-v2.webp",
  learning: "learning-v2.webp",
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
      src={`/mascot/${poseArtwork[pose] ?? `${pose}.png`}`}
      alt={decorative ? "" : poseDescription[pose]}
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

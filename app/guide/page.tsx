import type { Metadata } from "next";
import InteractiveGuide from "@/features/guide/components/interactive-guide";

export const metadata: Metadata = {
  title: "คู่มือครูและผู้ปกครอง — Chumkosoft",
  description: "เรียนรู้การผูก LINE แจ้งลา ขอมาสาย เช็คชื่อ และพิจารณาคำขอ พร้อมภาพจำลองหน้าจอทีละขั้นสำหรับครูและผู้ปกครอง",
};

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ role?: string | string[] }> }): Promise<React.ReactNode> {
  const params = await searchParams;
  return <InteractiveGuide initialRole={params.role === "teacher" ? "teacher" : "parent"} />;
}

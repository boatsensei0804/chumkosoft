import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import BehaviorBrowser from "@/features/behavior/components/behavior-browser";
import { getBehaviorOverview } from "@/features/behavior/services/behavior-service";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = { title: "คะแนนความประพฤติ · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function BehaviorPage({ searchParams }: { searchParams: Promise<{ student?: string }> }): Promise<React.ReactNode> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const params = await searchParams;
  const data = await getBehaviorOverview(params.student, user);
  return <>
    <PageHeader title="คะแนนความประพฤติ" subtitle="เริ่มต้น 100 คะแนนต่อภาคเรียน มาสายเข้าโรงเรียนหัก 10 คะแนน และครูสามารถเพิ่มหรือหักพร้อมหัวข้อ" />
    <BehaviorBrowser key={data.selectedStudent?.id ?? "none"} data={data} />
  </>;
}

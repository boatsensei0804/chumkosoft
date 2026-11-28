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
    <PageHeader compact pose="conduct" title="คะแนนความประพฤติ" subtitle="เลือกนักเรียนเพื่อดูคะแนนปัจจุบัน เพิ่มหรือหักคะแนน และตรวจประวัติ" />
    <BehaviorBrowser data={data} />
  </>;
}

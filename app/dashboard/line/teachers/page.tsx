import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/features/dashboard/components/page-header";
import AdvisorLineOverview from "@/features/line/components/advisor-line-overview";
import { requireRoles } from "@/lib/dal";
import prisma from "@/lib/prisma";

export const metadata: Metadata = { title: "สถานะ LINE ครู · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function TeacherLineStatusPage(): Promise<React.ReactNode> {
  await requireRoles(["ADMIN"]);
  const staff = await prisma.staff.findMany({
    where: { isDeleted: false },
    select: {
      id: true, prefix: true, firstName: true, lastName: true, staffCode: true, type: true,
      lineUserId: true, lineLinkCode: true,
      user: { select: { role: true, isActive: true, isDeleted: true } },
      advisories: {
        where: { classroom: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } } },
        select: { classroom: { select: { code: true } } },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const rows = staff.map((person) => ({
    id: person.id,
    name: `${person.prefix ?? ""}${person.firstName} ${person.lastName}`,
    staffCode: person.staffCode,
    code: person.lineLinkCode,
    type: person.type,
    classrooms: person.advisories.map((entry) => entry.classroom.code),
    status: person.lineUserId ? "CONNECTED" as const :
      !person.user || person.user.isDeleted || !person.user.isActive || person.user.role !== "TEACHER" ? "NO_ACCOUNT" as const :
      person.lineLinkCode ? "PENDING" as const : "UNLINKED" as const,
  }));
  return <>
    <PageHeader title="สถานะ LINE ครูและบุคลากร" subtitle="ตรวจว่าใครเชื่อมบัญชี LINE OA สำเร็จแล้ว และใครยังรอส่งรหัส" actions={<Link href="/dashboard/line" className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-brand-ink">กลับหน้า LINE ผู้ปกครอง</Link>} />
    <AdvisorLineOverview rows={rows} />
  </>;
}

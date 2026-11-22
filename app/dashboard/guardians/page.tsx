import Link from "next/link";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { GraduationCap, UserCheck, UserX } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import GuardianManager from "@/features/guardians/components/guardian-manager";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { advisoryClassroomIds } from "@/lib/teacher-data-access";
import { listStudentGuardians, listGuardianClassrooms, getGuardianStats } from "@/features/guardians/services/guardian-service";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = {
  title: "ผู้ปกครอง · chumkosoft",
};

export const dynamic = "force-dynamic";

interface GuardiansPageProps {
  searchParams: Promise<{ page?: string; q?: string; classroom?: string; view?: string }>;
}

export default async function GuardiansPage({ searchParams }: GuardiansPageProps): Promise<React.ReactNode> {
  const user = await requireRoles(STAFF_ROLES);
  const editableClassroomIds = user.role === "ADMIN" ? null : await advisoryClassroomIds(user);
  const params = await searchParams;
  const familyView = user.role === "ADMIN" && params.view === "family";
  if (familyView) return <GuardianFamilyView query={typeof params.q === "string" ? params.q.trim().slice(0, 100) : ""} />;
  const query = params.q ?? "";
  const classroomId = params.classroom ?? "";
  const [result, classrooms, stats] = await Promise.all([
    listStudentGuardians({ page: parsePage(params.page), search: query, classroomId: classroomId || undefined }),
    listGuardianClassrooms(),
    getGuardianStats({ search: query, classroomId: classroomId || undefined }),
  ]);

  return (
    <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <PageHeader
        title="ผู้ปกครอง"
        actions={<>{user.role === "ADMIN" && <Link href="/dashboard/guardians?view=family" className="inline-flex min-h-10 items-center rounded-xl bg-brand px-3 text-sm font-semibold text-white">ดูตามบัญชีครอบครัว</Link>}<Link href={`/dashboard/line/report?${new URLSearchParams({ classroom: user.role === "ADMIN" || editableClassroomIds?.includes(classroomId) ? classroomId || "all" : "all" })}`} className="inline-flex min-h-10 items-center rounded-xl border border-line bg-white px-3 text-sm font-semibold text-brand-ink">ดูรายงานการผูก LINE</Link></>}
        subtitle={user.role === "ADMIN" ? "จัดการข้อมูลบิดา มารดา และผู้ปกครองของนักเรียน — สำหรับการผูก LINE และแจ้งเตือน ดูที่เมนู LINE / แจ้งเตือน" : "ดูข้อมูลผู้ปกครอง และแก้ไขได้เฉพาะนักเรียนในห้องที่คุณเป็นครูที่ปรึกษา"}
      />
      <StatStrip className="mb-3 !grid-cols-1 sm:!grid-cols-3"
        items={[
          { label: "นักเรียนทั้งหมด", value: stats.students, hint: "คน", icon: GraduationCap, tone: "brand" },
          { label: "มีข้อมูลผู้ปกครอง", value: stats.withGuardian, hint: "คน", icon: UserCheck, tone: "success" },
          { label: "ยังไม่มีข้อมูลผู้ปกครอง", value: Math.max(0, stats.students - stats.withGuardian), hint: "คน", icon: UserX, tone: "warning" },
        ]}
      />
      <GuardianManager page={result} query={query} classrooms={classrooms} classroomId={classroomId} editableClassroomIds={editableClassroomIds} />
    </div>
  );
}

async function GuardianFamilyView({ query }: { query: string }): Promise<React.ReactNode> {
  const activeEnrollment = {
    isDeleted: false,
    term: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } },
    classroom: { isDeleted: false },
  };
  const guardians = await prisma.guardian.findMany({
    where: {
      isDeleted: false,
      OR: [{ userId: { not: null } }, { lineUserId: { not: null } }],
      student: { isDeleted: false, enrollments: { some: activeEnrollment } },
    },
    select: {
      fullName: true, userId: true, lineUserId: true,
      student: { select: {
        id: true, firstName: true, lastName: true, studentCode: true,
        enrollments: { where: activeEnrollment, orderBy: { createdAt: "desc" }, take: 1, select: { classroom: { select: { code: true } } } },
      } },
    },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
  });
  type Guardian = (typeof guardians)[number];
  const groups = new Map<string, { names: Set<string>; students: Map<string, Guardian["student"]>; web: boolean; line: boolean }>();
  for (const guardian of guardians) {
    const key = guardian.userId ? `web:${guardian.userId}` : `line:${guardian.lineUserId}`;
    const family = groups.get(key) ?? { names: new Set<string>(), students: new Map<string, Guardian["student"]>(), web: false, line: false };
    family.names.add(guardian.fullName);
    family.students.set(guardian.student.id, guardian.student);
    family.web ||= Boolean(guardian.userId);
    family.line ||= Boolean(guardian.lineUserId);
    groups.set(key, family);
  }
  const visible = Array.from(groups.values()).filter((family) =>
    [...family.names, ...Array.from(family.students.values(), (student) => `${student.firstName} ${student.lastName} ${student.studentCode}`)]
      .some((value) => value.toLowerCase().includes(query.toLowerCase())),
  );

  return <>
    <PageHeader title="ผู้ปกครองตามบัญชีครอบครัว" subtitle="รวมรายชื่อนักเรียนในภาคเรียนปัจจุบันตามบัญชีเว็บที่เชื่อมไว้ หรือบัญชี LINE เมื่อยังไม่มีบัญชีเว็บ"
      actions={<Link href="/dashboard/guardians" className="inline-flex min-h-10 items-center rounded-xl border border-line bg-white px-3 text-sm font-semibold text-brand-ink">กลับไปดูตามนักเรียน</Link>} />
    <form action="/dashboard/guardians" className="mb-4 flex flex-wrap gap-2">
      <input type="hidden" name="view" value="family" />
      <input name="q" defaultValue={query} maxLength={100} aria-label="ค้นหาชื่อผู้ปกครองหรือนักเรียน" placeholder="ชื่อผู้ปกครอง ชื่อนักเรียน หรือรหัส" className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm sm:max-w-sm" />
      <button className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white">ค้นหา</button>
    </form>
    <div className="grid gap-3 lg:grid-cols-2">
      {visible.map((family, index) => (
        <section key={index} className="rounded-2xl border border-blue-100 bg-white p-4">
          <h2 className="font-semibold text-ink-strong">{Array.from(family.names).join(" · ")}</h2>
          <p className="mt-1 text-xs text-muted">{family.web ? "มีบัญชีเว็บ" : "ยังไม่มีบัญชีเว็บ"} · {family.line ? "เชื่อม LINE แล้ว" : "ยังไม่เชื่อม LINE"}</p>
          <ul className="mt-3 divide-y divide-blue-100">
            {Array.from(family.students.values(), (student) => (
              <li key={student.id}><Link href={`/dashboard/students/${encodeURIComponent(student.id)}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2 text-sm font-semibold text-brand-ink hover:underline">
                {student.firstName} {student.lastName}<span className="text-xs text-muted">{student.studentCode} · {student.enrollments[0]?.classroom.code ?? "ยังไม่จัดห้อง"}</span>
              </Link></li>
            ))}
          </ul>
        </section>
      ))}
      {!visible.length && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">ไม่พบบัญชีครอบครัวที่ตรงกับคำค้น</p>}
    </div>
  </>;
}

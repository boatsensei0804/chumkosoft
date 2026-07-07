import prisma from "@/lib/prisma";

export interface DashboardCounts {
  students: number;
  teachers: number;
  offerings: number;
  pendingEnrollments: number;
  termName: string | null;
}

/** Headline counts for the overview, scoped to the active term where relevant. */
export async function getDashboardCounts(): Promise<DashboardCounts> {
  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { id: true, name: true },
  });
  const termFilter = term ? { termId: term.id } : {};

  const [students, teachers, offerings, pendingEnrollments] = await Promise.all([
    prisma.student.count({ where: { isDeleted: false } }),
    prisma.staff.count({ where: { isDeleted: false, type: "TEACHER" } }),
    prisma.courseOffering.count({ where: { isDeleted: false, ...termFilter } }),
    prisma.enrollment.count({ where: { isDeleted: false, status: "PENDING", ...termFilter } }),
  ]);

  return { students, teachers, offerings, pendingEnrollments, termName: term?.name ?? null };
}

export async function listAnnouncementRows(limit: number) {
  return prisma.announcement.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, kind: true, title: true, body: true, postedBy: true, createdAt: true },
  });
}

/** Enrolment dates since a cutoff, for the monthly trend chart. */
export async function findEnrolmentDatesSince(since: Date): Promise<Date[]> {
  const rows = await prisma.enrollment.findMany({
    where: { isDeleted: false, enrolledAt: { gte: since } },
    select: { enrolledAt: true },
  });
  return rows.map((r) => r.enrolledAt);
}

export interface ActiveAcademicContext {
  buddhistYear: number | null;
  termNumber: number | null;
}

/** The current working year + term, used to label term-scoped surfaces. */
export async function getActiveAcademicContext(): Promise<ActiveAcademicContext> {
  const term = await prisma.term.findFirst({
    where: { isActive: true, isDeleted: false },
    select: { number: true, academicYear: { select: { buddhistYear: true } } },
  });

  return {
    buddhistYear: term?.academicYear.buddhistYear ?? null,
    termNumber: term?.number ?? null,
  };
}

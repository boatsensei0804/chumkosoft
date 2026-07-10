import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusChip from "@/features/dashboard/components/status-chip";
import SectionCard from "@/features/dashboard/components/section-card";
import ClassroomOfferings from "@/features/classrooms/components/classroom-offerings";
import { getClassroomDetail, listOfferingOptions } from "@/features/classrooms/services/classroom-service";

export const metadata: Metadata = {
  title: "รายละเอียดห้องเรียน · chumkosoft",
};

export const dynamic = "force-dynamic";

interface ClassroomDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomDetailPage({ params }: ClassroomDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;
  const [detail, offeringOptions] = await Promise.all([getClassroomDetail(id), listOfferingOptions()]);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/classrooms" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink">
        <ChevronLeft className="size-[18px]" />
        กลับไปรายการห้องเรียน
      </Link>

      {/* Header: the relationship anchor — classroom + homeroom teacher */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-[12px] bg-brand-soft text-brand-ink">
            <Users className="size-6" />
          </span>
          <div>
            <h1 className="text-[22px] font-bold text-ink-strong">{detail.code}</h1>
            <p className="text-[13px] text-muted">
              {detail.gradeLevel}
              {detail.termLabel ? ` · ${detail.termLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[12px] border border-line bg-surface-2 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink" aria-hidden="true">
            <UserCheck className="size-[19px]" />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">
              ครูที่ปรึกษา{detail.advisors.length > 1 ? ` (${detail.advisors.length} คน)` : ""}
            </p>
            {detail.advisors.length > 0 ? (
              <ul className="mt-0.5 flex flex-col gap-1">
                {detail.advisors.map((a, i) => (
                  <li key={`${a.name}-${i}`}>
                    <span className="text-[14px] font-semibold text-ink-strong">{a.name}</span>
                    {a.position && <span className="ml-1.5 text-[12px] text-muted">· {a.position}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-faint">ยังไม่กำหนด</p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Roster: students in this homeroom this term */}
        <SectionCard title="รายชื่อนักเรียนในห้อง" caption={`${detail.roster.length.toLocaleString("th-TH")} คน · ภาคเรียนปัจจุบัน`} bodyClassName="p-0">
          {detail.roster.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[420px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>นักเรียน</TableHead>
                    <TableHead className="text-right">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.roster.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-[30px]">
                            <AvatarFallback className="bg-brand-soft text-[12px] font-semibold text-brand-ink">{s.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium text-ink-strong">{s.name}</p>
                            <p className="tabular text-[12px] text-muted">รหัส {s.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusChip status={s.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-[13.5px] text-muted">ยังไม่มีนักเรียนในห้องนี้ในภาคเรียนปัจจุบัน — เพิ่มได้ที่หน้านักเรียน (เลือกชั้นเรียน)</p>
          )}
        </SectionCard>

        {/* Offerings: subjects taught to this class + who teaches them (editable) */}
        <ClassroomOfferings classroomId={detail.id} offerings={detail.offerings} options={offeringOptions} />
      </div>
    </div>
  );
}

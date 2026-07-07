import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Icon from "@/features/dashboard/components/icon";
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
        <Icon name="chevron_down" sx={{ fontSize: 18, transform: "rotate(90deg)" }} />
        กลับไปรายการห้องเรียน
      </Link>

      {/* Header: the relationship anchor — classroom + homeroom teacher */}
      <section className="flex flex-col gap-4 rounded-[16px] p-5 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-[12px]" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
            <Icon name="groups" sx={{ fontSize: 24 }} />
          </span>
          <div>
            <h1 className="text-[22px] font-bold text-ink-strong">{detail.code}</h1>
            <p className="text-[13px] text-muted">
              {detail.gradeLevel}
              {detail.termLabel ? ` · ${detail.termLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <span className="grid size-9 place-items-center rounded-full" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }} aria-hidden="true">
            <Icon name="how_to_reg" sx={{ fontSize: 19 }} />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">ครูที่ปรึกษา</p>
            {detail.homeroomTeacher ? (
              <>
                <p className="text-[14px] font-semibold text-ink-strong">{detail.homeroomTeacher}</p>
                {detail.homeroomTeacherPosition && <p className="text-[12px] text-muted">{detail.homeroomTeacherPosition}</p>}
              </>
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
              <Table sx={{ minWidth: 420 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>นักเรียน</TableCell>
                    <TableCell align="right">สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.roster.map((s) => (
                    <TableRow key={s.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar sx={{ width: 30, height: 30, bgcolor: "var(--brand-soft)", color: "var(--brand-ink)", fontSize: 12 }}>{s.name.charAt(0)}</Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium text-ink-strong">{s.name}</p>
                            <p className="tabular text-[12px] text-muted">รหัส {s.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell align="right">
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

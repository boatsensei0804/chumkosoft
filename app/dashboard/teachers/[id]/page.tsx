import RecordSections from "@/features/dashboard/components/record-sections";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import SectionCard from "@/features/dashboard/components/section-card";
import Mascot from "@/components/ui/mascot";
import { getStaffDetail } from "@/services/staff-service";
import { requireRoles } from "@/lib/dal";
import type { StaffKind } from "@/features/teachers/types";

export const metadata: Metadata = {
  title: "ข้อมูลบุคลากร · chumkosoft",
};

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<StaffKind, string> = {
  TEACHER: "ครูผู้สอน",
  PERSONNEL: "บุคลากร",
  ADMIN: "ผู้ดูแลระบบ",
};

function formatThaiDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function ageFrom(iso: string | null): number | null {
  if (!iso) return null;
  const b = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** A single labelled read-only field. Shows an em dash when empty. */
function Field({ label, value }: { label: string; value: string | number | null }): React.ReactNode {
  const display = value === null || value === "" ? "—" : String(value);
  const empty = value === null || value === "";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] font-medium text-faint">{label}</span>
      <span className={`text-[14px] ${empty ? "text-faint" : "font-medium text-ink-strong"}`}>{display}</span>
    </div>
  );
}

interface TeacherDetailPageProps {
  params: Promise<{ id: string }>;
  inDialog?: boolean;
}

export default async function TeacherDetailPage({ params, inDialog = false }: TeacherDetailPageProps): Promise<React.ReactNode> {
  const user = await requireRoles(["ADMIN", "TEACHER"]);
  const { id } = await params;
  const detail = await getStaffDetail(id);
  if (!detail) notFound();
  const s = user.role === "ADMIN" || user.staffId === id ? detail : {
    ...detail, birthDate: null, nationalId: null, positionNumber: null, salary: null,
    licenseNumber: null, licenseExpiry: null, loginEmail: null,
  };

  const fullName = [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
  const age = ageFrom(s.birthDate);
  const salaryText = s.salary !== null ? `${s.salary.toLocaleString("th-TH")} บาท` : null;

  return (
    <div className="flex flex-col gap-5">
      {!inDialog && <Link href="/dashboard/teachers" className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-muted hover:bg-brand-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">
        <ChevronLeft aria-hidden="true" className="size-[18px]" />
        กลับไปรายชื่อครูและบุคลากร
      </Link>}

      {/* Header */}
      <section className="flex flex-col gap-4 rounded-[24px] school-card bg-linear-to-r from-school-panel to-school-panel-tint p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 place-items-center rounded-full text-[20px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }} aria-hidden="true">
            {s.firstName.charAt(0)}
          </span>
          <div>
            <h1 className="wrap-anywhere text-[22px] font-bold leading-snug text-ink-strong">{fullName}</h1>
            <p className="text-[13px] text-muted">
              รหัส {s.code}
              {s.position ? ` · ${s.position}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3"><span className="inline-flex w-fit items-center rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand-ink">{KIND_LABEL[s.type]}</span><Mascot pose="staff" size={76} decorative className="hidden lg:block" /></div>
      </section>

      <RecordSections labels={["ข้อมูลส่วนบุคคล", "ข้อมูลราชการและใบประกอบวิชาชีพ", "วุฒิการศึกษา", "วิชาที่สอน (ภาคเรียนปัจจุบัน)"]}>
        <SectionCard title="ข้อมูลส่วนบุคคล" bodyClassName="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="วัน/เดือน/ปีเกิด" value={formatThaiDate(s.birthDate)} />
            <Field label="อายุ" value={age !== null ? `${age} ปี` : null} />
            <Field label="เลขบัตรประจำตัวประชาชน" value={s.nationalId} />
            <Field label="เบอร์โทรศัพท์" value={s.phone} />
            <Field label="อีเมล" value={s.email} />
          </div>
        </SectionCard>

        <SectionCard title="ข้อมูลราชการและใบประกอบวิชาชีพ" bodyClassName="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="เลขที่ตำแหน่ง" value={s.positionNumber} />
            <Field label="เงินเดือนปัจจุบัน" value={salaryText} />
            <Field label="เลขที่ใบอนุญาตประกอบวิชาชีพ" value={s.licenseNumber} />
            <Field label="วันหมดอายุใบประกอบวิชาชีพ" value={formatThaiDate(s.licenseExpiry)} />
          </div>
        </SectionCard>

        <SectionCard title="วุฒิการศึกษา" bodyClassName="p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-faint">ปริญญาตรี</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="คุณวุฒิ" value={s.degreeBachelor} />
                <Field label="สาขา" value={s.fieldBachelor} />
                <Field label="มหาวิทยาลัย" value={s.universityBachelor} />
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--line)" }} className="pt-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-faint">ปริญญาโท</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="คุณวุฒิ" value={s.degreeMaster} />
                <Field label="สาขา" value={s.fieldMaster} />
                <Field label="มหาวิทยาลัย" value={s.universityMaster} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="วิชาที่สอน (ภาคเรียนปัจจุบัน)" caption={`${s.teaching.length.toLocaleString("th-TH")} วิชา`} bodyClassName="p-0">
          {s.teaching.length > 0 ? (
            <ul>
              {s.teaching.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink-strong">{t.courseName}</p>
                    <p className="tabular text-[12.5px] text-muted">
                      {t.courseCode} · ห้อง {t.classroomCode}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-[13px] text-muted">{t.periodsPerWeek} คาบ/สัปดาห์</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-[13.5px] text-muted">ยังไม่มีวิชาที่สอนในภาคเรียนปัจจุบัน</p>
          )}
        </SectionCard>
      </RecordSections>
    </div>
  );
}

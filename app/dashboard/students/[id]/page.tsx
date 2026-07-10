import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquare } from "lucide-react";
import SectionCard from "@/features/dashboard/components/section-card";
import StatusChip from "@/features/dashboard/components/status-chip";
import { getStudentDetail } from "@/services/student-service";

export const metadata: Metadata = {
  title: "ข้อมูลนักเรียน · chumkosoft",
};

export const dynamic = "force-dynamic";

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

/** Joins address parts into a single readable line; null when nothing filled. */
function addressLine(parts: (string | null)[]): string | null {
  const filled = parts.filter((p) => p && p.trim() !== "");
  return filled.length > 0 ? filled.join(" ") : null;
}

function Field({ label, value }: { label: string; value: string | number | null }): React.ReactNode {
  const empty = value === null || value === "";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] font-medium text-faint">{label}</span>
      <span className={`text-[14px] ${empty ? "text-faint" : "font-medium text-ink-strong"}`}>{empty ? "—" : String(value)}</span>
    </div>
  );
}

function Tags({ items }: { items: string[] }): React.ReactNode {
  if (items.length === 0) return <span className="text-[13.5px] text-faint">— ไม่มี —</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="inline-flex items-center rounded-full px-2.5 py-1 text-[12.5px] font-medium" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
          {t}
        </span>
      ))}
    </div>
  );
}

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps): Promise<React.ReactNode> {
  const { id } = await params;
  const s = await getStudentDetail(id);
  if (!s) notFound();

  const fullName = [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
  const age = ageFrom(s.birthDate);
  const regAddr = addressLine([
    s.regHouseNo && `บ้านเลขที่ ${s.regHouseNo}`,
    s.regMoo && `หมู่ ${s.regMoo}`,
    s.regSoi,
    s.regRoad,
    s.regTambon && `ต.${s.regTambon}`,
    s.regAmphoe && `อ.${s.regAmphoe}`,
    s.regProvince && `จ.${s.regProvince}`,
    s.regPostalCode,
  ]);
  const curAddr = addressLine([
    s.curHouseNo && `บ้านเลขที่ ${s.curHouseNo}`,
    s.curMoo && `หมู่ ${s.curMoo}`,
    s.curSoi,
    s.curRoad,
    s.curTambon && `ต.${s.curTambon}`,
    s.curAmphoe && `อ.${s.curAmphoe}`,
    s.curProvince && `จ.${s.curProvince}`,
    s.curPostalCode,
  ]);
  const commute = addressLine([
    s.commuteMethod,
    s.commuteRoadType,
    s.commuteDistanceM !== null ? `${s.commuteDistanceM.toLocaleString("th-TH")} ม.` : null,
    s.commuteMinutes !== null ? `${s.commuteMinutes} นาที` : null,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/students" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink">
        <ChevronLeft className="size-[18px]" />
        กลับไปรายชื่อนักเรียน
      </Link>

      {/* Header */}
      <section className="flex flex-col gap-4 rounded-[16px] p-5 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 place-items-center rounded-full text-[20px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }} aria-hidden="true">
            {s.firstName.charAt(0)}
          </span>
          <div>
            <h1 className="text-[22px] font-bold text-ink-strong">{fullName}</h1>
            <p className="text-[13px] text-muted">
              รหัส {s.code} · ห้อง {s.classroom} · {s.grade}
            </p>
          </div>
        </div>
        <StatusChip status={s.status} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="ข้อมูลตัวตน" bodyClassName="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ชื่อ-สกุล (อังกฤษ)" value={addressLine([s.firstNameEn, s.lastNameEn])} />
            <Field label="เลขบัตรประชาชน" value={s.nationalId} />
            <Field label="เพศ" value={s.gender} />
            <Field label="วัน/เดือน/ปีเกิด" value={formatThaiDate(s.birthDate)} />
            <Field label="อายุ" value={age !== null ? `${age} ปี` : null} />
            <Field label="กรุ๊ปเลือด" value={s.bloodType} />
            <Field label="เชื้อชาติ" value={s.ethnicity} />
            <Field label="สัญชาติ" value={s.nationality} />
            <Field label="ศาสนา" value={s.religion} />
            <Field label="ภาษาหลัก" value={s.primaryLanguage} />
            <Field label="เบอร์โทรศัพท์" value={s.phone} />
            <Field label="อีเมล" value={s.email} />
          </div>
        </SectionCard>

        <SectionCard title="การเกิด การศึกษา และสุขภาพ" bodyClassName="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="โรงพยาบาลที่เกิด" value={s.birthHospital} />
            <Field label="สถานที่เกิด" value={addressLine([s.birthTambon && `ต.${s.birthTambon}`, s.birthAmphoe && `อ.${s.birthAmphoe}`, s.birthProvince && `จ.${s.birthProvince}`])} />
            <Field label="สถานศึกษาเดิม" value={s.previousSchool} />
            <Field label="แผนการเรียน" value={s.studyPlan} />
            <Field label="น้ำหนัก" value={s.weightKg !== null ? `${s.weightKg} กก.` : null} />
            <Field label="ส่วนสูง" value={s.heightCm !== null ? `${s.heightCm} ซม.` : null} />
            <Field label="โรคประจำตัว" value={s.chronicDisease} />
          </div>
        </SectionCard>

        <SectionCard title="ที่อยู่และการเดินทาง" bodyClassName="p-5">
          <div className="flex flex-col gap-4">
            <Field label="ที่อยู่ตามทะเบียนบ้าน" value={regAddr} />
            <Field label="ที่อยู่ปัจจุบัน" value={curAddr} />
            <Field label="การเดินทางมาโรงเรียน" value={commute} />
          </div>
        </SectionCard>

        <SectionCard title="สถานภาพครอบครัว" bodyClassName="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="สถานภาพบิดามารดา" value={s.parentMaritalStatus} />
            <Field label="เป็นบุตรคนที่" value={s.birthOrder} />
            <Field label="จำนวนพี่ชาย" value={s.siblingsOlderBrothers} />
            <Field label="จำนวนพี่สาว" value={s.siblingsOlderSisters} />
            <Field label="จำนวนน้องชาย" value={s.siblingsYoungerBrothers} />
            <Field label="จำนวนน้องสาว" value={s.siblingsYoungerSisters} />
            <Field label="จำนวนที่ผู้ปกครองอุปการะ" value={s.dependantsCount} />
          </div>
        </SectionCard>

        <SectionCard title="กลุ่มพิเศษ (DMC)" bodyClassName="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-faint">เด็กด้อยโอกาส</span>
              <Tags items={s.disadvantages} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-faint">การขาดแคลน</span>
              <Tags items={s.shortages} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-faint">ความพิการ</span>
              <Tags items={s.disabilities} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="บิดา มารดา และผู้ปกครอง" caption={`${s.guardians.length.toLocaleString("th-TH")} คน`} bodyClassName="p-0">
          {s.guardians.length > 0 ? (
            <ul>
              {s.guardians.map((g) => (
                <li key={g.id} className="flex flex-col gap-1 px-5 py-3.5" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-ink-strong">
                      {[g.prefix, g.fullName].filter(Boolean).join(" ")}
                      <span className="ml-2 text-[12.5px] font-normal text-muted">({g.relation})</span>
                    </p>
                    {g.linked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-[oklch(0.42_0.1_152)]">
                        <MessageSquare className="size-[13px]" />
                        ผูก LINE แล้ว
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-muted">
                    {addressLine([
                      g.occupation && `อาชีพ ${g.occupation}`,
                      g.monthlyIncome !== null ? `รายได้ ${g.monthlyIncome.toLocaleString("th-TH")} บาท/เดือน` : null,
                      g.phone && `โทร ${g.phone}`,
                    ]) ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-[13.5px] text-muted">ยังไม่มีข้อมูลผู้ปกครอง — เพิ่มได้ที่หน้าผู้ปกครอง & LINE</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

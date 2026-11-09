"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, GraduationCap, Users, type LucideIcon } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import TimetableBuilder from "./timetable-builder";
import { subjectColors } from "../data";
import type { ContextOption, DayInfo, DayKey, ExternalBusy, Offering, PeriodRow, ScheduleOverviewData, ScheduleOverviewSlot } from "../types";
import type { OfferingOptions } from "@/features/classrooms/types";

type MainView = "overview" | "edit";
type OverviewView = "all" | "classroom" | "teacher";

interface TimetableWorkspaceProps {
  context: { termId: string; termName: string; classroomId: string; classroomCode: string } | null;
  terms: ContextOption[];
  classrooms: ContextOption[];
  offeringOptions: OfferingOptions;
  days: DayInfo[];
  periods: PeriodRow[];
  offerings: Offering[];
  externalBusy: ExternalBusy[];
  overview: ScheduleOverviewData;
}

export default function TimetableWorkspace(props: TimetableWorkspaceProps): React.ReactNode {
  const [mainView, setMainView] = useState<MainView>("overview");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="มุมมองตารางสอน" className="flex w-fit flex-wrap gap-1 rounded-lg border border-line bg-surface-2 p-1">
        <MainTab active={mainView === "overview"} onClick={() => setMainView("overview")} icon={CalendarDays}>ภาพรวมตารางสอน</MainTab>
        <MainTab active={mainView === "edit"} onClick={() => setMainView("edit")} icon={Clock3}>จัดและแก้ตาราง</MainTab>
      </div>
      {mainView === "overview" ? <TimetableOverview {...props} /> : <TimetableBuilder {...props} key={`${props.context?.termId ?? "none"}:${props.context?.classroomId ?? "none"}`} />}
    </div>
  );
}

function MainTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: LucideIcon; children: React.ReactNode }): React.ReactNode {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold", active ? "bg-bg text-brand-ink shadow-sm" : "text-muted hover:text-ink-strong")}
    >
      <Icon className="size-4" />{children}
    </button>
  );
}

function TimetableOverview(props: TimetableWorkspaceProps): React.ReactNode {
  const router = useRouter();
  const [view, setView] = useState<OverviewView>("all");
  const [classroomId, setClassroomId] = useState(props.context?.classroomId ?? props.overview.classrooms[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(props.overview.teachers[0]?.id ?? "");
  const activeTermId = props.context?.termId ?? "";

  const colorByOffering = useMemo(() => {
    const ids = [...new Set(props.overview.slots.map((slot) => slot.offeringId))];
    return new Map(ids.map((id, index) => [id, Object.keys(subjectColors)[index % Object.keys(subjectColors).length] as keyof typeof subjectColors]));
  }, [props.overview.slots]);

  function selectTerm(termId: string): void {
    router.push(`/dashboard/timetable?term=${encodeURIComponent(termId)}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-bg px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-xs font-medium text-muted">ดูการจัดสอนทั้งภาคเรียน</p>
          <h2 className="mt-0.5 text-base font-semibold text-ink-strong">ภาพรวม · ห้องเรียน · ครูผู้สอน</h2>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          ภาคเรียน
          <NativeSelect value={activeTermId} onChange={(event) => selectTerm(event.target.value)} className="min-w-[220px] bg-bg font-semibold" aria-label="เลือกภาคเรียนเพื่อดูภาพรวม">
            {props.terms.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}
          </NativeSelect>
        </label>
      </section>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-bg sm:grid-cols-4">
        <Metric icon={GraduationCap} label="ห้องเรียน" value={props.overview.classrooms.length} />
        <Metric icon={Users} label="ครูที่มีรายวิชา" value={props.overview.teachers.length} />
        <Metric icon={Clock3} label="คาบที่จัดแล้ว" value={props.overview.placedPeriods} />
        <Metric icon={CalendarDays} label="เป้าหมายคาบ" value={props.overview.requiredPeriods} />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <OverviewTab active={view === "all"} onClick={() => setView("all")}>ภาพรวมทุกห้อง</OverviewTab>
        <OverviewTab active={view === "classroom"} onClick={() => setView("classroom")}>ดูตามห้อง</OverviewTab>
        <OverviewTab active={view === "teacher"} onClick={() => setView("teacher")}>ดูตามครู</OverviewTab>
      </div>

      {view === "all" ? (
        <ClassroomSummary
          overview={props.overview}
          days={props.days}
          onSelect={(id) => { setClassroomId(id); setView("classroom"); }}
        />
      ) : view === "classroom" ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted sm:max-w-xs">
            เลือกห้องเรียน
            <NativeSelect value={classroomId} onChange={(event) => setClassroomId(event.target.value)} className="bg-bg font-semibold">
              {props.overview.classrooms.map((room) => <option key={room.id} value={room.id}>{room.code} · {room.gradeLevel}</option>)}
            </NativeSelect>
          </label>
          <ReadOnlyGrid
            days={props.days}
            periods={props.periods}
            slots={props.overview.slots.filter((slot) => slot.classroomId === classroomId)}
            colorByOffering={colorByOffering}
            secondary="teacher"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted sm:max-w-xs">
            เลือกครู
            <NativeSelect value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="bg-bg font-semibold">
              {props.overview.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </NativeSelect>
          </label>
          <ReadOnlyGrid
            days={props.days}
            periods={props.periods}
            slots={props.overview.slots.filter((slot) => slot.teacherId === teacherId)}
            colorByOffering={colorByOffering}
            secondary="classroom"
          />
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }): React.ReactNode {
  return (
    <div className="flex items-center gap-2.5 border-b border-r border-line p-3.5 sm:p-4">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-ink" aria-hidden="true"><Icon className="size-4" /></span>
      <div><p className="text-[11px] font-medium text-muted">{label}</p><p className="tabular text-base font-semibold text-ink-strong">{value.toLocaleString("th-TH")}</p></div>
    </div>
  );
}

function OverviewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }): React.ReactNode {
  return <button type="button" onClick={onClick} className={cn("border-b-2 px-3 py-2 text-[13px] font-semibold", active ? "border-brand text-brand-ink" : "border-transparent text-muted hover:text-ink-strong")}>{children}</button>;
}

function ClassroomSummary({ overview, days, onSelect }: { overview: ScheduleOverviewData; days: DayInfo[]; onSelect: (id: string) => void }): React.ReactNode {
  if (overview.classrooms.length === 0) return <EmptySchedule message="ยังไม่มีห้องเรียนในภาคเรียนที่เลือก" />;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-bg">
      <header className="border-b border-line px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-ink-strong">คาบเรียนที่จัดแล้ว แยกตามห้องและวัน</h3>
        <p className="mt-0.5 text-xs text-muted">เลือกแถวเพื่อเปิดตารางรายสัปดาห์ของห้องนั้น</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-line bg-surface text-xs font-semibold text-muted"><th className="px-4 py-3">ห้อง</th>{days.map((day) => <th key={day.key} className="px-3 py-3 text-center">{day.short}</th>)}<th className="px-3 py-3 text-right">จัดแล้ว / เป้าหมาย</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {overview.classrooms.map((room) => {
              const dayCounts = new Map<DayKey, number>();
              for (const slot of overview.slots) if (slot.classroomId === room.id) dayCounts.set(slot.day, (dayCounts.get(slot.day) ?? 0) + 1);
              const progress = room.requiredPeriods > 0 ? Math.round((room.slots / room.requiredPeriods) * 100) : 0;
              return (
                <tr key={room.id} className="border-b border-line last:border-0 hover:bg-brand-softer">
                  <td className="px-4 py-3"><p className="font-semibold text-ink-strong">{room.code}</p><p className="text-xs text-muted">{room.gradeLevel}</p></td>
                  {days.map((day) => <td key={day.key} className="tabular px-3 py-3 text-center text-muted">{dayCounts.get(day.key) ?? 0}</td>)}
                  <td className="tabular px-3 py-3 text-right"><span className="font-semibold text-ink-strong">{room.slots}/{room.requiredPeriods}</span><span className="ml-2 text-xs text-muted">{progress}%</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => onSelect(room.id)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-soft">ดูตาราง →</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReadOnlyGrid({
  days,
  periods,
  slots,
  colorByOffering,
  secondary,
}: {
  days: DayInfo[];
  periods: PeriodRow[];
  slots: ScheduleOverviewSlot[];
  colorByOffering: Map<string, keyof typeof subjectColors>;
  secondary: "teacher" | "classroom";
}): React.ReactNode {
  const byCell = new Map(slots.map((slot) => [`${slot.day}:${slot.periodId}`, slot]));
  if (periods.length === 0) return <EmptySchedule message="ยังไม่มีข้อมูลคาบเรียน" />;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-bg">
      <div className="border-b border-line px-4 py-3 text-xs text-muted">ตารางนี้เป็นมุมมองสำหรับดูข้อมูล · เปลี่ยนแปลงตารางได้ในแท็บ “จัดและแก้ตาราง”</div>
      {slots.length === 0 ? <EmptySchedule message="ยังไม่มีวิชาจัดลงในตารางของรายการนี้" /> : (
        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid gap-px bg-line" style={{ gridTemplateColumns: "78px repeat(5, minmax(130px, 1fr))" }}>
              <div className="bg-surface px-2 py-2.5 text-[11px] font-semibold text-muted">คาบ</div>
              {days.map((day) => <div key={day.key} className="bg-surface px-2 py-2.5 text-center text-xs font-semibold text-ink-strong">{day.label}</div>)}
              {periods.map((period) => period.kind === "break" ? (
                <div key={period.id} className="col-span-6 bg-surface-2 px-3 py-2 text-center text-xs font-medium text-muted">{period.label} · {period.start}–{period.end}</div>
              ) : (
                <PeriodRowCells key={period.id} period={period} days={days} byCell={byCell} colorByOffering={colorByOffering} secondary={secondary} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PeriodRowCells({ period, days, byCell, colorByOffering, secondary }: {
  period: PeriodRow;
  days: DayInfo[];
  byCell: Map<string, ScheduleOverviewSlot>;
  colorByOffering: Map<string, keyof typeof subjectColors>;
  secondary: "teacher" | "classroom";
}): React.ReactNode {
  return <>
    <div className="flex flex-col justify-center bg-surface px-2 py-1"><span className="text-xs font-semibold text-ink">{period.label}</span><span className="text-[10px] text-faint">{period.start}–{period.end}</span></div>
    {days.map((day) => {
      const slot = byCell.get(`${day.key}:${period.id}`);
      const palette = slot ? subjectColors[colorByOffering.get(slot.offeringId) ?? "blue"] : null;
      return (
        <div key={`${day.key}:${period.id}`} className="min-h-[68px] bg-bg p-1.5">
          {slot && palette && <div className="flex h-full min-h-[58px] flex-col gap-0.5 overflow-hidden rounded-md px-2 py-1.5" style={{ backgroundColor: palette.bg, color: palette.ink, border: `1px solid color-mix(in oklch, ${palette.bar} 30%, transparent)` }}>
            <p className="truncate text-[11.5px] font-bold">{slot.courseName}</p>
            <p className="truncate text-[10.5px] opacity-80">{secondary === "teacher" ? slot.teacherName : slot.classroomCode}</p>
            <p className="truncate text-[10px] opacity-70">{slot.roomName}</p>
          </div>}
        </div>
      );
    })}
  </>;
}

function EmptySchedule({ message }: { message: string }): React.ReactNode {
  return <MascotEmptyState title={message} description="เลือกภาคเรียน ห้อง หรือครูอื่นเพื่อดูตารางที่มีข้อมูล" compact />;
}

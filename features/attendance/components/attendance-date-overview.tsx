import CalendarDisclosure from "./calendar-disclosure";
import AttendanceCalendar, { type AttendanceCalendarProps } from "./attendance-calendar";

/** Calendar and its persisted selected-day figures always share the same scope. */
export default function AttendanceDateOverview(props: AttendanceCalendarProps): React.ReactNode {
  const day = props.days.find((item) => item.date === props.selectedDate);
  const school = props.mode === "school";
  const value = (count: number | undefined) => count === undefined ? "—" : count.toLocaleString("th-TH");
  const progress = day && day.total > 0 ? Math.min(100, Math.round(day.checked / day.total * 100)) : 0;
  const date = new Date(`${props.selectedDate}T00:00:00Z`);
  const dateLabel = Number.isNaN(date.getTime()) ? props.selectedDate : new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" }).format(date);
  const noSession = day?.state === "no-session";
  return <section aria-label="ปฏิทินและสรุปวันที่เลือก" className="overflow-hidden rounded-2xl border border-school-panel-border bg-school-panel shadow-school-panel">
    <div className="grid grid-cols-1 items-start lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <div className="min-w-0"><CalendarDisclosure><AttendanceCalendar {...props} embedded /></CalendarDisclosure></div>
      <aside aria-label="สรุปวันที่เลือก" className="order-first min-w-0 h-full border-b border-school-panel-border bg-school-panel-tint p-3 lg:order-last lg:border-b-0 lg:border-l sm:p-5">
        <p className="text-xs font-semibold text-brand-ink">สรุปวันที่เลือก</p><h2 className="mt-1 text-base font-bold text-ink-strong">{dateLabel}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">{[
          { label: "นักเรียนทั้งหมด", count: day?.total, color: "text-ink-strong" },
          { label: school ? "เข้าโรงเรียนแล้ว" : "บันทึกเช็คชื่อแล้ว", count: day?.checked, color: "text-success" },
          { label: school ? "ยังไม่มีบันทึกเข้า" : "ยังไม่เช็คชื่อ", count: day?.unchecked, color: "text-muted" },
          { label: "มาสาย", count: day?.late, color: "text-warning" },
        ].map((item) => <div key={item.label} className="rounded-xl border border-school-panel-border bg-white px-3 py-2"><p className="text-[11px] leading-5 text-muted">{item.label}</p><p className={`mt-1 text-xl font-bold tabular ${item.color}`}>{value(item.count)}<span className="ml-1 text-[11px] font-normal text-muted">คน</span></p></div>)}</div>
        {day && !noSession && <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-muted"><span>{school ? "สัดส่วนเข้าโรงเรียน" : "ความคืบหน้าการบันทึก"}</span><strong className="text-brand-ink">{progress}%</strong></div><div role="progressbar" aria-label={school ? "สัดส่วนเข้าโรงเรียน" : "ความคืบหน้าการบันทึก"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-blue-100"><div style={{ width: `${progress}%` }} className="h-full rounded-full bg-brand" /></div></div>}
        <p className="mt-3 text-[11px] leading-5 text-muted">{!day ? "ไม่มีข้อมูลวันที่เลือกในเดือนนี้" : noSession ? props.mode === "class" ? "ไม่มีคาบเรียนที่จัดไว้ในวันที่เลือก" : "วันหยุดหรือไม่มีรายชื่อในวันที่เลือก" : school ? "มาสายรวมอยู่ในจำนวนที่เข้าแล้ว · ยังไม่มีบันทึกไม่ได้หมายถึงขาดเรียน" : "สรุปจากข้อมูลที่บันทึกแล้ว รวมทุกสถานะ · การแก้ไขในแบบฟอร์มจะแสดงที่นี่หลังบันทึก"}</p>
      </aside>
    </div>
  </section>;
}

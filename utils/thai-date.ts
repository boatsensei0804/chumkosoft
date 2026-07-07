const BANGKOK_TZ = "Asia/Bangkok";

function buddhistFormatter(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: BANGKOK_TZ, ...opts });
}

const shortDate = buddhistFormatter({ day: "numeric", month: "short", year: "numeric" });
const longDate = buddhistFormatter({ day: "numeric", month: "long", year: "numeric" });
const weekdayLong = new Intl.DateTimeFormat("th-TH", { timeZone: BANGKOK_TZ, weekday: "long" });

/** Format a date as a Thai Buddhist-era short date, e.g. "4 ก.ค. 2568". */
export function formatThaiDate(date: Date): string {
  return shortDate.format(date);
}

/** Bare Thai weekday without the "วัน" prefix, e.g. "ศุกร์". */
function thaiWeekday(date: Date): string {
  return weekdayLong.format(date).replace(/^วัน/, "");
}

/** "ศุกร์ 4 ก.ค. 2568" — weekday + short month, Buddhist era, Bangkok time. */
export function formatThaiWeekdayShort(date: Date): string {
  return `${thaiWeekday(date)} ${shortDate.format(date)}`;
}

/** "ศุกร์ 4 กรกฎาคม 2568" — weekday + long month, Buddhist era, Bangkok time. */
export function formatThaiWeekdayLong(date: Date): string {
  return `${thaiWeekday(date)} ${longDate.format(date)}`;
}

/** Time-of-day greeting in Bangkok time: เช้า / บ่าย / เย็น / ค่ำ. */
export function thaiGreeting(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: BANGKOK_TZ, hour: "2-digit", hour12: false }).format(date),
  );
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 16) return "สวัสดีตอนบ่าย";
  if (hour < 19) return "สวัสดีตอนเย็น";
  return "สวัสดีตอนค่ำ";
}

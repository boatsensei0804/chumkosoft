import { describe, it, expect } from "vitest";
import { formatThaiDate, formatThaiWeekdayShort, formatThaiWeekdayLong, thaiGreeting } from "@/utils/thai-date";

// 2025-07-04 is a Friday. In Buddhist era 2025 → 2568.
const friday = new Date("2025-07-04T05:00:00Z"); // 12:00 in Bangkok

describe("thai date formatting", () => {
  it("uses the Buddhist year", () => {
    expect(formatThaiDate(friday)).toContain("2568");
  });

  it("prefixes the weekday without 'วัน'", () => {
    const short = formatThaiWeekdayShort(friday);
    expect(short.startsWith("ศุกร์")).toBe(true);
    expect(short).not.toContain("วันศุกร์");
    expect(short).toContain("2568");
  });

  it("long form uses the full month name", () => {
    expect(formatThaiWeekdayLong(friday)).toContain("กรกฎาคม");
  });
});

describe("thaiGreeting (Bangkok time = UTC+7)", () => {
  it("morning before noon", () => {
    expect(thaiGreeting(new Date("2026-07-06T02:00:00Z"))).toBe("สวัสดีตอนเช้า"); // 09:00
  });
  it("afternoon", () => {
    expect(thaiGreeting(new Date("2026-07-06T07:00:00Z"))).toBe("สวัสดีตอนบ่าย"); // 14:00
  });
  it("evening", () => {
    expect(thaiGreeting(new Date("2026-07-06T10:30:00Z"))).toBe("สวัสดีตอนเย็น"); // 17:30
  });
  it("night", () => {
    expect(thaiGreeting(new Date("2026-07-06T14:00:00Z"))).toBe("สวัสดีตอนค่ำ"); // 21:00
  });
});

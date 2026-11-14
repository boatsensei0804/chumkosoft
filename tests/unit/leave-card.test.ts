import { describe, expect, it } from "vitest";
import { leaveCard } from "@/features/leave/leave-card";

describe("leave Flex cards", () => {
  it("keeps date picker actions and explicit confirmation intact", () => {
    const card = leaveCard("เลือกวันลา", "นักเรียน A", [{ type: "datetimepicker", label: "เลือกวัน", data: "leave|date|student|SICK", mode: "date", min: "2026-11-01", max: "2026-12-01" }]);
    expect(card.type).toBe("flex");
    expect(card.contents).toMatchObject({ type: "bubble", footer: { contents: [{ type: "button", action: { type: "datetimepicker", data: "leave|date|student|SICK" } }] } });
  });
  it("provides readable fallback, wrapped details, and a public mascot URL", () => {
    const card = leaveCard("ตรวจสรุป", "Child Two · 002\nลาป่วย", [{ type: "postback", label: "ยืนยัน", data: "leave|confirm|student2" }]);
    expect(card.altText).toContain("Child Two");
    expect(card.contents).toMatchObject({ body: { contents: [{ text: "Child Two · 002\nลาป่วย", wrap: true }] }, header: { contents: [expect.anything(), { type: "image", url: "https://chumkosoft.com/mascot/family.png" }] } });
  });
  it("caps fallback without breaking Unicode graphemes", () => {
    const card = leaveCard("สถานะ", "👨‍👩‍👧‍👦กิ".repeat(100), []);
    expect(card.altText.length).toBeLessThanOrEqual(390);
    expect(card.altText.endsWith("\u200d")).toBe(false);
    expect(card.contents).not.toHaveProperty("footer");
  });
});

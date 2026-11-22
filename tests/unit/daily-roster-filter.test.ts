import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DailyRollCallRoster from "@/features/attendance/components/daily-roll-call-roster";
import type { DailyClassRoster } from "@/features/attendance/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/features/attendance/daily-roll-call-actions", () => ({ saveDailyRollCallAction: vi.fn() }));

const roster: DailyClassRoster = {
  date: "2026-11-22",
  classroomId: "room-1",
  classroomCode: "ป.6/1",
  students: [
    { studentId: "1", code: "101", name: "นักเรียนมาสาย", status: "LATE" },
    { studentId: "2", code: "102", name: "นักเรียนยังไม่เช็ก", status: null },
    { studentId: "3", code: "103", name: "นักเรียนลาป่วย", status: "SICK_LEAVE" },
  ],
};

describe("homeroom roster opened from a status card", () => {
  it("shows only the students matching the selected saved status", () => {
    const props = { roster, initialFilter: "LATE" as const };
    const html = renderToStaticMarkup(createElement(DailyRollCallRoster, props));
    expect(html).toContain("นักเรียนมาสาย");
    expect(html).not.toContain("นักเรียนยังไม่เช็ก");
    expect(html).not.toContain("นักเรียนลาป่วย");
  });

  it("keeps the existing unchecked link working", () => {
    const html = renderToStaticMarkup(createElement(DailyRollCallRoster, { roster, initialFilter: "unchecked" }));
    expect(html).toContain("นักเรียนยังไม่เช็ก");
    expect(html).not.toContain("นักเรียนมาสาย");
  });

  it("shows every student for an unsupported filter", () => {
    const html = renderToStaticMarkup(createElement(DailyRollCallRoster, { roster, initialFilter: "unknown" }));
    expect(html).toContain("นักเรียนมาสาย");
    expect(html).toContain("นักเรียนยังไม่เช็ก");
    expect(html).toContain("นักเรียนลาป่วย");
  });
});

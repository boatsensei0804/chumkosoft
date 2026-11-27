import { describe, expect, it, vi } from "vitest";
import { getCurrentNavItem, getNavGroups } from "@/features/dashboard/nav";
import { getTodaySchedule } from "@/services/dashboard-service";

const findTeacherSlotsForDay = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/timetable-repository", () => ({ findTeacherSlotsForDay }));

describe("dashboard navigation by role", () => {
  it("starts both roles with daily tasks and keeps scanner settings admin-only", () => {
    const adminGroups = getNavGroups("ADMIN");
    const teacherGroups = getNavGroups("TEACHER");
    expect(adminGroups[1].label).toBe("งานประจำวัน");
    expect(teacherGroups[1].label).toBe("งานประจำวัน");
    const scannerGroup = adminGroups.find(({ label }) => label === "ระบบสแกนใบหน้า");
    expect(scannerGroup?.items.map(({ key }) => key)).toEqual(["kiosk", "faces"]);
    expect(teacherGroups.flatMap(({ items }) => items).map(({ key }) => key)).not.toContain("kiosk");
    expect(getCurrentNavItem(teacherGroups, "/dashboard/timetable")?.key).toBe("timetable-teacher");
  });

  it("selects the most specific settings destination", () => {
    const active = getCurrentNavItem(getNavGroups("ADMIN"), "/dashboard/settings/records");
    expect(active?.key).toBe("records");
  });
});

describe("teacher's schedule today", () => {
  it("uses the teacher's own slots for the Bangkok school day", async () => {
    findTeacherSlotsForDay.mockResolvedValue([{
      id: "slot-a", courseOfferingId: "offering-a", classroom: { code: "ป.6/1" },
      period: { startTime: "08:00", endTime: "09:00" },
      courseOffering: { course: { name: "คณิตศาสตร์" } },
      room: { code: "101", building: null, name: null },
    }]);
    const schedule = await getTodaySchedule("teacher-a", new Date("2026-11-27T01:15:00Z"));
    expect(findTeacherSlotsForDay).toHaveBeenCalledWith("teacher-a", "FRI");
    expect(schedule.items[0]).toMatchObject({ offeringId: "offering-a", classroom: "ป.6/1", now: true });
  });

  it("leaves the schedule empty when the teacher account isn't linked to staff", async () => {
    findTeacherSlotsForDay.mockClear();
    const schedule = await getTodaySchedule(null, new Date("2026-11-27T01:15:00Z"));
    expect(schedule.items).toEqual([]);
    expect(findTeacherSlotsForDay).not.toHaveBeenCalled();
  });
});

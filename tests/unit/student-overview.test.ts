import { describe, expect, it } from "vitest";
import { buildStudentOverview, countRoster, filterRoster, studentGender, studentOverviewHref, type RosterStudent, type StudentListFilters } from "@/features/students/overview";
const rooms = [{ id: "room2", code: "ม.1/2", gradeLevel: "มัธยมต้น" }, { id: "room10", code: "ม.1/10", gradeLevel: "มัธยมต้น" }, { id: "room4", code: "ม.4/1", gradeLevel: "มัธยมปลาย" }];
const rows: RosterStudent[] = [
  { id: "a", code: "001", firstName: "ต้น", lastName: "ดี", gender: "ชาย", classroomId: "room2", status: "ACTIVE" },
  { id: "b", code: "002", firstName: "มะลิ", lastName: "ดี", gender: "หญิง", classroomId: "room2", status: "PENDING" },
  { id: "c", code: "003", firstName: "ใบบัว", lastName: "ดี", gender: null, classroomId: "room4", status: "LEAVE" },
  { id: "d", code: "004", firstName: "ยังไม่จัดห้อง", lastName: "ดี", gender: "female", classroomId: null, status: null },
];
const defaults: StudentListFilters = { search: "", filter: "all", classroom: "", gender: "all", grade: "" };
describe("student registry overview", () => {
  it("counts all registry students once and reconciles current-term rooms plus unassigned students", () => {
    const overview = buildStudentOverview(rows, rooms, "2/2569");
    expect(overview.overall).toEqual({ total: 4, male: 1, female: 2, other: 1, active: 1, pending: 1, leave: 1, unassigned: 1 });
    expect(overview.rooms.map(room => room.code)).toEqual(["ม.1/2", "ม.1/10", "ม.4/1"]);
    expect(overview.rooms.reduce((sum, room) => sum + room.total, overview.overall.unassigned)).toBe(4);
    expect(overview.rooms[1].total).toBe(0);
    expect(countRoster([...rows, rows[0]]).total).toBe(4);
  });
  it("normalizes stored gender without guessing from names, including unknown values", () => {
    expect(studentGender(" FEMALE ")).toBe("female"); expect(studentGender("m")).toBe("male");
    expect(studentGender("อื่น ๆ")).toBe("other"); expect(studentGender(null)).toBe("other");
  });
  it("combines classroom, gender, status, and full-name search before pagination", () => {
    const result = filterRoster(rows, rooms, { ...defaults, classroom: "room2", gender: "female", filter: "pending", search: " มะลิ   ดี " });
    expect(result.map(row => row.id)).toEqual(["b"]);
    expect(filterRoster(rows, rooms, { ...defaults, grade: "มัธยมปลาย" }).map(row => row.id)).toEqual(["c"]);
    expect(filterRoster(rows, rooms, { ...defaults, classroom: "unassigned" }).map(row => row.id)).toEqual(["d"]);
    expect(filterRoster(rows, rooms, { ...defaults, filter: "active" }).map(row => row.id)).toEqual(["a"]);
  });
  it("does not turn an unknown classroom or missing enrollment into active students", () => {
    expect(filterRoster(rows, rooms, { ...defaults, classroom: "missing" })).toEqual([]);
    expect(filterRoster(rows, rooms, { ...defaults, classroom: "unassigned", filter: "active" })).toEqual([]);
    const empty = buildStudentOverview([], [], null); expect(empty.overall.total).toBe(0);
  });
  it("links aggregate totals to a fresh filtered list, rather than retaining hidden search conditions", () => {
    expect(studentOverviewHref({ classroom: "room2", gender: "all" })).toBe("/dashboard/students?classroom=room2#student-roster");
  });
});

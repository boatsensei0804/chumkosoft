import { describe, it, expect } from "vitest";
import { courseSchema } from "@/features/courses/schemas/course-schema";
import { staffSchema } from "@/features/teachers/schemas/staff-schema";
import { studentSchema } from "@/features/students/schemas/student-schema";
import { classroomSchema } from "@/features/classrooms/schemas/classroom-schema";
import { offeringSchema } from "@/features/classrooms/schemas/offering-schema";

describe("courseSchema", () => {
  it("accepts a valid course", () => {
    const r = courseSchema.safeParse({ code: "ค30201", name: "คณิตศาสตร์เพิ่มเติม", credits: 1.5, description: null });
    expect(r.success).toBe(true);
  });
  it("rejects an empty code", () => {
    const r = courseSchema.safeParse({ code: "  ", name: "x", credits: null, description: null });
    expect(r.success).toBe(false);
  });
  it("rejects negative credits", () => {
    const r = courseSchema.safeParse({ code: "c1", name: "x", credits: -1, description: null });
    expect(r.success).toBe(false);
  });
});

describe("staffSchema", () => {
  it("accepts a valid teacher", () => {
    const r = staffSchema.safeParse({ staffCode: "T-001", prefix: "อ.", firstName: "วีรยา", lastName: "สุขใจ", type: "TEACHER", position: null, email: null, phone: null });
    expect(r.success).toBe(true);
  });
  it("rejects an invalid email", () => {
    const r = staffSchema.safeParse({ staffCode: "T-002", prefix: null, firstName: "a", lastName: "b", type: "TEACHER", position: null, email: "not-an-email", phone: null });
    expect(r.success).toBe(false);
  });
  it("rejects an unknown staff type", () => {
    const r = staffSchema.safeParse({ staffCode: "T-003", prefix: null, firstName: "a", lastName: "b", type: "WIZARD", position: null, email: null, phone: null });
    expect(r.success).toBe(false);
  });
});

describe("studentSchema", () => {
  it("accepts a valid student with a date", () => {
    const r = studentSchema.safeParse({ studentCode: "68-0421", prefix: "ด.ช.", firstName: "ธนกฤต", lastName: "ก", gender: "ชาย", birthDate: new Date("2010-01-01"), classroomId: null });
    expect(r.success).toBe(true);
  });
  it("rejects a missing first name", () => {
    const r = studentSchema.safeParse({ studentCode: "x", prefix: null, firstName: "", lastName: "y", gender: null, birthDate: null, classroomId: null });
    expect(r.success).toBe(false);
  });
  it("rejects an invalid birthDate", () => {
    const r = studentSchema.safeParse({ studentCode: "x", prefix: null, firstName: "a", lastName: "b", gender: null, birthDate: new Date("nope"), classroomId: null });
    expect(r.success).toBe(false);
  });
});

describe("classroomSchema", () => {
  it("accepts a valid classroom", () => {
    expect(classroomSchema.safeParse({ code: "ม.4/1", gradeLevel: "มัธยมปลาย", homeroomTeacherId: "staff1" }).success).toBe(true);
  });
  it("allows a null homeroom teacher", () => {
    expect(classroomSchema.safeParse({ code: "ม.4/2", gradeLevel: "มัธยมปลาย", homeroomTeacherId: null }).success).toBe(true);
  });
});

describe("offeringSchema", () => {
  it("accepts a valid offering", () => {
    expect(offeringSchema.safeParse({ courseId: "c1", teacherId: "t1", roomId: "r1", periodsPerWeek: 3 }).success).toBe(true);
  });
  it("rejects zero periods", () => {
    expect(offeringSchema.safeParse({ courseId: "c1", teacherId: "t1", roomId: "r1", periodsPerWeek: 0 }).success).toBe(false);
  });
});

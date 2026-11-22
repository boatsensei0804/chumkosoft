import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleTeacherLinePostback } from "@/features/line/services/teacher-line-workspace";

const mocks = vi.hoisted(() => ({
  teachers: vi.fn(), requests: vi.fn(), request: vi.fn(), attendance: vi.fn(), review: vi.fn(), reply: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: { user: { findMany: mocks.teachers }, leaveRequest: { findMany: mocks.requests, findFirst: mocks.request } },
}));
vi.mock("@/lib/line", () => ({ replyLineMessage: mocks.reply }));
vi.mock("@/features/attendance/services/daily-roll-call-service", () => ({ getDailyRollCallOverview: mocks.attendance }));
vi.mock("@/features/leave/services/leave-review-service", () => ({ reviewLeaveRequest: mocks.review }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.teachers.mockResolvedValue([{ id: "teacher-1", role: "TEACHER", staffId: "staff-1" }]);
  mocks.reply.mockResolvedValue(true);
});

const request = {
  id: "leave-1", kind: "LATE", reason: "มีนัดหมาย",
  startDate: new Date("2026-11-22"), endDate: new Date("2026-11-22"),
  expectedArrivalTime: "09:00", classroom: { code: "ม.1/1" },
  student: { firstName: "นักเรียน", lastName: "ตัวอย่าง" },
};

describe("teacher LINE workspace", () => {
  it("does not access school data without a unique active teacher account", async () => {
    mocks.teachers.mockResolvedValue([]);
    await handleTeacherLinePostback("line-1", "teacher|summary", "reply-1");
    expect(mocks.attendance).not.toHaveBeenCalled();
    expect(mocks.reply).toHaveBeenCalledWith("reply-1", expect.objectContaining({ type: "flex" }));
  });

  it("loads the attendance summary scoped to the linked teacher", async () => {
    mocks.attendance.mockResolvedValue([]);
    await handleTeacherLinePostback("line-1", "teacher|summary", "reply-1");
    expect(mocks.attendance).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), "staff-1");
  });

  it("cannot approve a request outside the teacher's pending queue", async () => {
    mocks.request.mockResolvedValue(null);
    await handleTeacherLinePostback("line-1", "teacher|approve|leave-1", "reply-1");
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      id: "leave-1", status: "PENDING", classroom: expect.objectContaining({ advisors: { some: { staffId: "staff-1" } } }),
    }) }));
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("uses the existing review service with a recorded reason", async () => {
    mocks.request.mockResolvedValue(request);
    mocks.review.mockResolvedValue({ ok: true, message: "ไม่อนุมัติคำขอแล้ว" });
    await handleTeacherLinePostback("line-1", "teacher|reject|leave-1|details", "reply-1");
    expect(mocks.review).toHaveBeenCalledWith("leave-1", "REJECTED", "ข้อมูลในคำขอไม่ครบ กรุณาติดต่อครูที่ปรึกษา", {
      id: "teacher-1", staffId: "staff-1", role: "TEACHER",
    });
  });

  it("asks for confirmation without approving on the first tap", async () => {
    mocks.request.mockResolvedValue(request);
    await handleTeacherLinePostback("line-1", "teacher|choose-approval|leave-1", "reply-1");
    expect(mocks.review).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.reply.mock.calls)).toContain("teacher|approve|leave-1");
  });

  it("rejects unknown rejection reasons before loading any request", async () => {
    await handleTeacherLinePostback("line-1", "teacher|reject|leave-1|other", "reply-1");
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("lists only pending requests scoped to the teacher and provides a review button", async () => {
    mocks.requests.mockResolvedValue([request]);
    await handleTeacherLinePostback("line-1", "teacher|pending", "reply-1");
    expect(mocks.requests).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      status: "PENDING", classroom: expect.objectContaining({ advisors: { some: { staffId: "staff-1" } } }),
    }) }));
    expect(JSON.stringify(mocks.reply.mock.calls)).toContain("teacher|review|leave-1");
  });
});

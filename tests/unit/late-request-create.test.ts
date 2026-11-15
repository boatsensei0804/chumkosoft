import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ term: vi.fn(), student: vi.fn(), prior: vi.fn(), overlap: vi.fn(), create: vi.fn(), arrived: vi.fn(), update: vi.fn(), reply: vi.fn(), replyText: vi.fn(), send: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { term: { findFirst: mocks.term }, student: { findFirst: mocks.student }, leaveRequest: { findUnique: mocks.prior, findFirst: mocks.overlap, create: mocks.create, update: mocks.update }, schoolEntry: { findFirst: mocks.arrived } } }));
vi.mock("@/lib/line", () => ({ replyLineMessage: mocks.reply, replyText: mocks.replyText, sendLineTextToUsers: mocks.send }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.audit }));
import { handleLeaveLineMessage } from "@/features/leave/services/line-leave-service";
const text = "ขอมาสาย 002 2026-11-16 09:30 การเดินทางล่าช้า";
function request() { return { id: "r", classroomId: "room", kind: "LATE", startDate: new Date("2026-11-16"), endDate: new Date("2026-11-16"), expectedArrivalTime: "09:30", reason: "การเดินทางล่าช้า", advisorLineTargets: ["teacherLine"], advisorNotifyRetryKey: "retry", advisorNotifiedCount: 0, student: { studentCode: "002", firstName: "ChildTwo", lastName: "Family" }, classroom: { code: "2/1" } }; }
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-16T00:00:00Z"));
  mocks.term.mockResolvedValue({ id: "term", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-30") });
  mocks.student.mockResolvedValue({ id: "child2", studentCode: "002", firstName: "ChildTwo", lastName: "Family", enrollments: [{ classroomId: "room", classroom: { code: "2/1", advisors: [{ staff: { lineUserId: "teacherLine", isDeleted: false } }] } }] });
  mocks.prior.mockResolvedValue(request()).mockResolvedValueOnce(null); mocks.overlap.mockResolvedValue(null); mocks.arrived.mockResolvedValue(null); mocks.create.mockResolvedValue({ id: "r" }); mocks.reply.mockResolvedValue(true); mocks.replyText.mockResolvedValue(true); mocks.send.mockResolvedValue({ accepted: true, code: "HTTP_200" });
});
afterEach(() => vi.useRealTimers());
describe("parent requests advance late arrival", () => {
  it("records the chosen child and expected Thai arrival time, leaving approval pending, then notifies the advisor", async () => {
    expect(await handleLeaveLineMessage("parent", text, "reply", "message")).toBe(true);
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studentId: "child2", kind: "LATE", expectedArrivalTime: "09:30", startDate: new Date("2026-11-16"), endDate: new Date("2026-11-16"), parentLineUserId: "parent" }) });
    expect(mocks.create.mock.calls[0][0].data.status).toBeUndefined();
    expect(mocks.send).toHaveBeenCalledWith(["teacherLine"], expect.stringContaining("09:30"), "retry");
    expect(JSON.stringify(mocks.reply.mock.calls)).toContain("รอครูที่ปรึกษาอนุมัติ");
  });
  it("checks parent ownership before creating any request", async () => {
    mocks.student.mockResolvedValue(null);
    await handleLeaveLineMessage("stranger", text, "r", "event");
    expect(mocks.student.mock.calls[0][0].where.OR[0].guardians.some.lineUserId).toBe("stranger");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects requests after the expected time has passed in Bangkok", async () => {
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z"));
    await handleLeaveLineMessage("parent", text, "r", "event");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalledWith("r", expect.stringContaining("ล่วงหน้า"));
  });
  it("rejects new requests after an actual check-in", async () => {
    mocks.arrived.mockResolvedValue({ id: "entry" });
    await handleLeaveLineMessage("parent", text, "r", "event");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("preserves event idempotency even if a webhook retry arrives after the expected time", async () => {
    mocks.prior.mockReset().mockResolvedValue(request());
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z"));
    await handleLeaveLineMessage("parent", text, "r", "same-event");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalled();
  });
  it("blocks an overlapping leave or late request", async () => {
    mocks.overlap.mockResolvedValue({ id: "existing" });
    await handleLeaveLineMessage("parent", text, "r", "event");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects malformed clock times before touching student data", async () => {
    await handleLeaveLineMessage("parent", text.replace("09:30", "25:99"), "r", "event");
    expect(mocks.student).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

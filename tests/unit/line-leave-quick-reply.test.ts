import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  termFindFirst: vi.fn(), studentFindMany: vi.fn(), studentFindFirst: vi.fn(),
  replyLineMessage: vi.fn(), replyText: vi.fn(), handleLeaveLineMessage: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: { term: { findFirst: mocks.termFindFirst }, student: { findMany: mocks.studentFindMany, findFirst: mocks.studentFindFirst } } }));
vi.mock("@/lib/line", () => ({ replyLineMessage: mocks.replyLineMessage, replyText: mocks.replyText }));
vi.mock("@/features/leave/services/line-leave-service", () => ({ handleLeaveLineMessage: mocks.handleLeaveLineMessage }));

import { handleLeavePostback, startLineLeaveChoices } from "@/features/leave/services/line-leave-quick-reply";

describe("LINE leave menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.termFindFirst.mockResolvedValue({ id: "term1", startDate: new Date("2026-11-01T00:00:00Z"), endDate: new Date("2026-12-31T00:00:00Z") });
    mocks.studentFindMany.mockResolvedValue([{ id: "student1", studentCode: "68-0421", firstName: "มะลิ", lastName: "ดี" }]);
    mocks.studentFindFirst.mockResolvedValue({ id: "student1", studentCode: "68-0421", firstName: "มะลิ", lastName: "ดี" });
    mocks.replyLineMessage.mockResolvedValue(true);
    mocks.replyText.mockResolvedValue(true);
    mocks.handleLeaveLineMessage.mockResolvedValue(true);
  });

  it("starts with only students linked to this LINE user", async () => {
    expect(await startLineLeaveChoices("Uparent", "reply")).toBe(true);
    expect(mocks.studentFindMany.mock.calls[0][0].where.OR).toHaveLength(2);
    const message = mocks.replyLineMessage.mock.calls[0][1];
    expect(message.quickReply.items[0].action.data).toBe("leave|student|student1");
  });

  it("walks through type, date, range, reason, confirmation and creates a pending request", async () => {
    await handleLeavePostback("Uparent", "leave|student|student1", undefined, "r1", "e1");
    expect(mocks.replyLineMessage.mock.lastCall?.[1].quickReply.items[0].action.data).toBe("leave|kind|student1|SICK");
    await handleLeavePostback("Uparent", "leave|kind|student1|SICK", undefined, "r2", "e2");
    expect(mocks.replyLineMessage.mock.lastCall?.[1].quickReply.items[0].action.type).toBe("datetimepicker");
    await handleLeavePostback("Uparent", "leave|date|student1|SICK", "2026-11-14", "r3", "e3");
    await handleLeavePostback("Uparent", "leave|range|student1|SICK|2026-11-14", undefined, "r4", "e4");
    expect(mocks.replyLineMessage.mock.lastCall?.[1].quickReply.items[0].action.max).toBe("2026-12-14");
    await handleLeavePostback("Uparent", "leave|end|student1|SICK|2026-11-14", "2026-11-15", "r5", "e5");
    await handleLeavePostback("Uparent", "leave|reason|student1|SICK|2026-11-14|2026-11-15|fever", undefined, "r6", "e6");
    expect(mocks.replyLineMessage.mock.lastCall?.[1].quickReply.items[0].action.data).toContain("leave|confirm");
    await handleLeavePostback("Uparent", "leave|confirm|student1|SICK|2026-11-14|2026-11-15|fever", undefined, "r7", "event7");
    expect(mocks.handleLeaveLineMessage).toHaveBeenCalledWith("Uparent", "ลา 68-0421 ป่วย 2026-11-14 ถึง 2026-11-15 มีไข้ ไม่สบาย", "r7", "event7");
  });

  it("does not create a request for an unlinked student", async () => {
    mocks.studentFindFirst.mockResolvedValue(null);
    await handleLeavePostback("Uparent", "leave|confirm|other|SICK|2026-11-14|2026-11-14|fever", undefined, "reply", "event");
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalled();
  });
});

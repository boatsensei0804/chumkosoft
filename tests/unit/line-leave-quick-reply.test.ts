import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leaveFindMany: vi.fn(), termFindFirst: vi.fn(), studentFindMany: vi.fn(), studentFindFirst: vi.fn(),
  replyLineMessage: vi.fn(), replyText: vi.fn(), handleLeaveLineMessage: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: { leaveRequest: { findMany: mocks.leaveFindMany }, term: { findFirst: mocks.termFindFirst }, student: { findMany: mocks.studentFindMany, findFirst: mocks.studentFindFirst } } }));
vi.mock("@/lib/line", () => ({ replyLineMessage: mocks.replyLineMessage, replyText: mocks.replyText }));
vi.mock("@/features/leave/services/line-leave-service", () => ({ handleLeaveLineMessage: mocks.handleLeaveLineMessage }));

import { handleLeavePostback, startLineLeaveChoices } from "@/features/leave/services/line-leave-quick-reply";

function actionItems(message: unknown): { action: { type: string; data?: string; label: string; max?: string } }[] {
  if (!message || typeof message !== "object") return [];
  const node = message as Record<string, unknown>;
  const own = node.action ? [{ action: node.action as { type: string; data?: string; label: string; max?: string } }] : [];
  return [...own, ...Object.entries(node).filter(([key]) => key !== "action").flatMap(([, value]) => Array.isArray(value) ? value.flatMap(actionItems) : actionItems(value))];
}
function cardText(message: unknown): string { return JSON.stringify(message); }

describe("LINE leave menu", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T02:00:00Z"));
    vi.clearAllMocks();
    mocks.termFindFirst.mockResolvedValue({ id: "term1", startDate: new Date("2026-11-01T00:00:00Z"), endDate: new Date("2026-12-31T00:00:00Z") });
    mocks.studentFindMany.mockResolvedValue([{ id: "student1", studentCode: "68-0421", firstName: "มะลิ", lastName: "ดี" }]);
    mocks.studentFindFirst.mockResolvedValue({ id: "student1", studentCode: "68-0421", firstName: "มะลิ", lastName: "ดี" });
    mocks.replyLineMessage.mockResolvedValue(true);
    mocks.replyText.mockResolvedValue(true);
    mocks.leaveFindMany.mockResolvedValue([]);
    mocks.handleLeaveLineMessage.mockResolvedValue(true);
  });

  it("starts with only students linked to this LINE user", async () => {
    expect(await startLineLeaveChoices("Uparent", "reply")).toBe(true);
    expect(mocks.studentFindMany.mock.calls[0][0].where.OR).toHaveLength(2);
    const message = mocks.replyLineMessage.mock.calls[0][1];
    expect(actionItems(message)[0].action.data).toBe("leave|student|student1");
    expect(cardText(message)).toContain("มะลิ");
    expect(cardText(message)).toContain("/mascot/students.png");
  });

  it("walks through type, date, range, reason, confirmation and creates a pending request", async () => {
    await handleLeavePostback("Uparent", "leave|student|student1", undefined, "r1", "e1");
    expect(actionItems(mocks.replyLineMessage.mock.lastCall?.[1])[0].action.data).toBe("leave|kind|student1|SICK");
    await handleLeavePostback("Uparent", "leave|kind|student1|SICK", undefined, "r2", "e2");
    expect(actionItems(mocks.replyLineMessage.mock.lastCall?.[1]).some((item: { action: { type: string } }) => item.action.type === "datetimepicker")).toBe(true);
    await handleLeavePostback("Uparent", "leave|date|student1|SICK", "2026-11-14", "r3", "e3");
    await handleLeavePostback("Uparent", "leave|range|student1|SICK|2026-11-14", undefined, "r4", "e4");
    expect(actionItems(mocks.replyLineMessage.mock.lastCall?.[1])[0].action.max).toBe("2026-12-14");
    await handleLeavePostback("Uparent", "leave|end|student1|SICK|2026-11-14", "2026-11-15", "r5", "e5");
    await handleLeavePostback("Uparent", "leave|reason|student1|SICK|2026-11-14|2026-11-15|fever", undefined, "r6", "e6");
    expect(actionItems(mocks.replyLineMessage.mock.lastCall?.[1])[0].action.data).toContain("leave|confirm");
    await handleLeavePostback("Uparent", "leave|confirm|student1|SICK|2026-11-14|2026-11-15|fever", undefined, "r7", "event7");
    expect(mocks.handleLeaveLineMessage).toHaveBeenCalledWith("Uparent", "ลา 68-0421 ป่วย 2026-11-14 ถึง 2026-11-15 มีไข้ ไม่สบาย", "r7", "event7");
  });

  it("does not create a request for an unlinked student", async () => {
    mocks.studentFindFirst.mockResolvedValue(null);
    await handleLeavePostback("Uparent", "leave|confirm|other|SICK|2026-11-14|2026-11-14|fever", undefined, "reply", "event");
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
    expect(mocks.replyText).toHaveBeenCalled();
  });
  it("submits nothing on the short today path until confirmation", async () => {
    await handleLeavePostback("Uparent", "leave|kind|student1|SICK", undefined, "r", "event");
    const items = actionItems(mocks.replyLineMessage.mock.lastCall?.[1]);
    expect(items[0].action.data).toBe("leave|quick|student1|SICK|2026-11-14");
    expect(items[1].action.data).toBe("leave|quick|student1|SICK|2026-11-15");
    await handleLeavePostback("Uparent", items[0].action.data!, undefined, "r", "event");
    expect(cardText(mocks.replyLineMessage.mock.lastCall?.[1])).toContain("3/4");
    await handleLeavePostback("Uparent", "leave|reason|student1|SICK|2026-11-14|2026-11-14|fever", undefined, "r", "event");
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
    expect(actionItems(mocks.replyLineMessage.mock.lastCall?.[1]).some((item: { action: { label: string } }) => item.action.label === "แก้เหตุผล")).toBe(true);
  });

  it("paginates student cards within LINE's 12-bubble carousel limit", async () => {
    mocks.studentFindMany.mockResolvedValue(Array.from({ length: 25 }, (_, index) => ({ id: `student${index}`, firstName: `Child${index}`, lastName: "Test", studentCode: `${index}` })));
    await startLineLeaveChoices("Uparent", "r", 1);
    const items = actionItems(mocks.replyLineMessage.mock.lastCall?.[1]);
    expect(items).toHaveLength(13);
    expect(mocks.replyLineMessage.mock.lastCall?.[1].contents.contents).toHaveLength(11);
    expect(items[0].action.data).toBe("leave|student|student10");
    expect(items.at(-1)?.action.data).toBe("leave|history");
  });

  it("does not offer today or tomorrow beyond the active term", async () => {
    vi.setSystemTime(new Date("2026-12-31T02:00:00Z"));
    await handleLeavePostback("Uparent", "leave|kind|student1|SICK", undefined, "r", "event");
    const items = actionItems(mocks.replyLineMessage.mock.lastCall?.[1]);
    expect(items.some((item: { action: { label: string } }) => item.action.label === "ลาวันนี้")).toBe(true);
    expect(items.some((item: { action: { label: string } }) => item.action.label === "ลาพรุ่งนี้")).toBe(false);
  });

  it("reopens reason choices and never submits when editing the summary", async () => {
    await handleLeavePostback("Uparent", "leave|reasons|student1|SICK|2026-11-14|2026-11-15", undefined, "r", "event");
    expect(cardText(mocks.replyLineMessage.mock.lastCall?.[1])).toContain("3/4");
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
  });

  it("limits history to the sender and currently linked nondeleted students", async () => {
    await handleLeavePostback("Uparent", "leave|history", undefined, "r", "event");
    const query = mocks.leaveFindMany.mock.calls[0][0];
    expect(query.where.parentLineUserId).toBe("Uparent");
    expect(query.where.student.isDeleted).toBe(false);
    expect(query.where.student.OR[0].guardians.some.lineUserId).toBe("Uparent");
    expect(query.take).toBe(5);
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
  });

  it("uses the explicitly chosen second child when the parent has multiple children", async () => {
    mocks.studentFindMany.mockResolvedValue([
      { id: "student1", studentCode: "001", firstName: "ChildOne", lastName: "Family" },
      { id: "student2", studentCode: "002", firstName: "ChildTwo", lastName: "Family" },
    ]);
    await startLineLeaveChoices("Uparent", "r");
    const message = mocks.replyLineMessage.mock.lastCall?.[1];
    expect(cardText(message)).toContain("ChildOne Family");
    expect(cardText(message)).toContain("ChildTwo Family");
    expect(actionItems(message)[1].action.data).toBe("leave|student|student2");
    mocks.studentFindFirst.mockResolvedValue({ id: "student2", studentCode: "002", firstName: "ChildTwo", lastName: "Family" });
    await handleLeavePostback("Uparent", "leave|reason|student2|SICK|2026-11-14|2026-11-14|fever", undefined, "r", "event");
    expect(cardText(mocks.replyLineMessage.mock.lastCall?.[1])).toContain("ChildTwo Family");
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
    await handleLeavePostback("Uparent", "leave|confirm|student2|SICK|2026-11-14|2026-11-14|fever", undefined, "r", "event");
    expect(mocks.studentFindFirst.mock.lastCall?.[0].where.id).toBe("student2");
    expect(mocks.handleLeaveLineMessage).toHaveBeenCalledWith("Uparent", "ลา 002 ป่วย 2026-11-14 มีไข้ ไม่สบาย", "r", "event");
  });

  it("uses a normal button for the last possible end date instead of an invalid min=max picker", async () => {
    await handleLeavePostback("Uparent", "leave|range|student1|SICK|2026-12-31", undefined, "r", "event");
    const action = actionItems(mocks.replyLineMessage.mock.lastCall?.[1])[0].action;
    expect(action.type).toBe("postback");
    expect(action.data).toBe("leave|end|student1|SICK|2026-12-31|2026-12-31");
    await handleLeavePostback("Uparent", action.data!, undefined, "r", "event");
    expect(cardText(mocks.replyLineMessage.mock.lastCall?.[1])).toContain("3/4");
  });
  it("shows each recent request as a separate status card", async () => {
    mocks.leaveFindMany.mockResolvedValue([{ kind: "SICK", startDate: new Date("2026-11-14"), endDate: new Date("2026-11-14"), status: "APPROVED", reviewNote: "Reviewed", student: { firstName: "ChildTwo", lastName: "Family" } }]);
    await handleLeavePostback("Uparent", "leave|history", undefined, "r", "event");
    const message = mocks.replyLineMessage.mock.lastCall?.[1];
    expect(message.type).toBe("flex");
    expect(message.contents.type).toBe("carousel");
    expect(message.contents.contents).toHaveLength(1);
    expect(cardText(message)).toContain("/mascot/success.png");
    expect(cardText(message)).toContain("ChildTwo Family");
    expect(cardText(message)).toContain("อนุมัติแล้ว");
    expect(mocks.handleLeaveLineMessage).not.toHaveBeenCalled();
  });

});

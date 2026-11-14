import { beforeEach, describe, expect, it, vi } from "vitest";
import { announcementAudienceSchema, selectAudience, type AudienceCandidate } from "@/features/line/announcement-audience";

const db = vi.hoisted(() => ({ guardian: { findMany: vi.fn() }, studentLineAccount: { findMany: vi.fn() }, staff: { findMany: vi.fn() }, enrollment: { findMany: vi.fn() }, classroom: { findMany: vi.fn() }, lineAnnouncement: { findUnique: vi.fn(), create: vi.fn() } }));
const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/line", () => ({ isLineConfigured: () => true, sendLineMessageToUsers: send }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
import { resolveAnnouncementAudience, getAnnouncementAudienceOptions, recipientFingerprint } from "@/features/line/services/announcement-audience-service";
import { createAndSendLineAnnouncement } from "@/features/line/services/line-announcements";

const candidates: AudienceCandidate[] = [
  { id: "guardian:g1", label: "Parent A", kind: "parent", classroomIds: ["room1"], lineUserId: "line-parent" },
  { id: "guardian:g2", label: "Parent B", kind: "parent", classroomIds: ["room2"], lineUserId: "line-parent" },
  { id: "staff:t1", label: "Teacher", kind: "staff", classroomIds: [], lineUserId: "line-teacher" },
];
beforeEach(() => {
  vi.clearAllMocks();
  db.guardian.findMany.mockResolvedValue([{ id: "g1", fullName: "Parent A", studentId: "s1", lineUserId: "line-parent", student: { firstName: "One", lastName: "Student", studentCode: "001" } }]);
  db.studentLineAccount.findMany.mockResolvedValue([{ id: "a2", studentId: "s2", lineUserId: "line-parent", student: { firstName: "Two", lastName: "Student", studentCode: "002" } }]);
  db.staff.findMany.mockResolvedValue([{ id: "t1", firstName: "Teacher", lastName: "One", staffCode: "T1", lineUserId: "line-teacher" }]);
  db.enrollment.findMany.mockResolvedValue([{ studentId: "s1", classroomId: "room1" }, { studentId: "s2", classroomId: "room2" }]);
  db.classroom.findMany.mockResolvedValue([{ id: "room1", code: "1/1" }, { id: "room2", code: "1/2" }]);
  db.lineAnnouncement.findUnique.mockResolvedValue(null);
});

describe("announcement recipient selection", () => {
  it("room targeting excludes staff and parents in other rooms", () => {
    expect(selectAudience(candidates, { mode: "classrooms", ids: ["room2"] }).map((row) => row.id)).toEqual(["guardian:g2"]);
  });
  it("personal targeting includes only selected records", () => {
    expect(selectAudience(candidates, { mode: "people", ids: ["staff:t1"] }).map((row) => row.id)).toEqual(["staff:t1"]);
    expect(selectAudience(candidates, { mode: "staff" }).map((row) => row.id)).toEqual(["staff:t1"]);
  });
  it("does not silently widen malformed or empty selections to all", () => {
    expect(announcementAudienceSchema.safeParse({ mode: "classrooms", ids: [] }).success).toBe(false);
    expect(announcementAudienceSchema.safeParse({ mode: "all", ids: ["room1"] }).success).toBe(false);
    expect(announcementAudienceSchema.safeParse({ mode: "unknown" }).success).toBe(false);
  });
  it("deduplicates a parent's account linked via two children across rooms", async () => {
    const result = await resolveAnnouncementAudience({ mode: "classrooms", ids: ["room1", "room2"] });
    expect(result.recipients).toEqual(["line-parent"]);
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0]).toContain("001");
    expect(result.labels[0]).toContain("002");
  });
  it("rejects obsolete ids and never falls back to broadcast", async () => {
    await expect(resolveAnnouncementAudience({ mode: "people", ids: ["staff:missing"] })).rejects.toThrow("AUDIENCE_CHANGED");
  });
  it("keeps raw LINE target ids out of browser options", async () => {
    const options = await getAnnouncementAudienceOptions();
    expect(JSON.stringify(options)).not.toContain("line-parent");
    expect(JSON.stringify(options)).not.toContain("line-teacher");
  });
  it("fingerprints ignore order and duplicates but detect a same-size audience change", () => {
    expect(recipientFingerprint(["a", "b", "a"])).toBe(recipientFingerprint(["b", "a"]));
    expect(recipientFingerprint(["a"])).not.toBe(recipientFingerprint(["b"]));
  });
  it("blocks delivery if the reviewed account changes even when the count stays the same", async () => {
    const result = await createAndSendLineAnnouncement({ requestKey: "11111111-1111-4111-8111-111111111111", kind: "NEWS", title: "Test", body: "Test body", audience: { mode: "staff" }, expectedRecipients: 1, expectedRecipientFingerprint: recipientFingerprint(["old-teacher"]) }, "admin");
    expect(result.ok).toBe(false);
    expect(db.lineAnnouncement.create).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("does not reuse an existing announcement for a different audience", async () => {
    db.lineAnnouncement.findUnique.mockResolvedValue({ id: "existing", kind: "NEWS", title: "Test", body: "Test body", batches: [{ recipients: ["line-parent"] }] });
    const result = await createAndSendLineAnnouncement({ requestKey: "11111111-1111-4111-8111-111111111111", kind: "NEWS", title: "Test", body: "Test body", audience: { mode: "staff" }, expectedRecipients: 1, expectedRecipientFingerprint: recipientFingerprint(["line-teacher"]) }, "admin");
    expect(result.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(db.lineAnnouncement.create).not.toHaveBeenCalled();
  });

});

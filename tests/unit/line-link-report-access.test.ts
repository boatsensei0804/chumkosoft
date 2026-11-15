import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireRoles: vi.fn(), report: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRoles: mocks.requireRoles }));
vi.mock("@/features/line/services/line-link-report-service", () => ({ getLineLinkReport: mocks.report, InvalidReportClassroom: class extends Error {} }));
vi.mock("@/features/line/services/line-link-report-pdf", () => ({ createLineLinkReportPdf: mocks.pdf }));
import { GET } from "@/app/dashboard/line/report/export/route";
beforeEach(() => { vi.resetAllMocks(); mocks.requireRoles.mockResolvedValue({ role: "ADMIN" }); });
describe("binding report exports", () => {
  it("requires staff before accessing names or codes", async () => {
    mocks.requireRoles.mockRejectedValue(new Error("Forbidden"));
    await expect(GET(new Request("https://chumkosoft.com/dashboard/line/report/export?format=csv"))).rejects.toThrow("Forbidden");
    expect(mocks.requireRoles).toHaveBeenCalledWith(["ADMIN", "TEACHER"]); expect(mocks.report).not.toHaveBeenCalled();
  });
  it("rejects invalid filters without querying data", async () => {
    const response = await GET(new Request("https://chumkosoft.com/dashboard/line/report/export?format=invalid"));
    expect(response.status).toBe(400); expect(mocks.report).not.toHaveBeenCalled();
  });
  it("exports the complete filtered classroom report with private no-store headers", async () => {
    const student = { id: "student", studentCode: "00001", studentName: "ตัวอย่าง", classroomId: "room", classroom: "ม.1/1", status: "pending", linkedAccounts: 0, accounts: [{ guardianName: "ผู้ปกครอง", lineName: null, status: "pending", code: "001234" }] };
    mocks.report.mockResolvedValue({ term: "ภาคเรียนตัวอย่าง", hasActiveTerm: true, generatedAt: "2026-11-15T00:00:00Z", rooms: [{ id: "room", code: "ม.1/1", total: 1, linked: 0, percentage: 0 }], students: [student] });
    const response = await GET(new Request("https://chumkosoft.com/dashboard/line/report/export?format=csv&classroom=room&filter=pending"));
    expect(mocks.report).toHaveBeenCalledWith("room"); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toContain('"=""001234"""'); expect(mocks.pdf).not.toHaveBeenCalled();
  });
});

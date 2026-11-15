import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), report: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireRoles: m.auth }));
vi.mock("@/features/leave/services/leave-daily-report-service", () => ({ getLeaveDailyReport: m.report }));
vi.mock("@/features/leave/services/leave-summary-pdf", () => ({ createLeaveSummaryPdf: m.pdf }));
import { GET } from "@/app/dashboard/leave-requests/export/route";
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ id: "teacher", role: "TEACHER", staffId: "advisor" }); });
describe("daily leave chart PDF export", () => {
  it("requires staff authorization before accessing request data", async () => {
    m.auth.mockRejectedValue(new Error("Forbidden"));
    await expect(GET(new Request("https://chumkosoft.com/dashboard/leave-requests/export?date=2026-11-15"))).rejects.toThrow("Forbidden");
    expect(m.auth).toHaveBeenCalledWith(["ADMIN", "TEACHER"]); expect(m.report).not.toHaveBeenCalled();
  });
  it("rejects missing and rolled-over dates without reading the database", async () => {
    for (const query of ["", "?date=2026-02-30", "?date=invalid"]) expect((await GET(new Request(`https://chumkosoft.com/dashboard/leave-requests/export${query}`))).status).toBe(400);
    expect(m.report).not.toHaveBeenCalled();
  });
  it("does not export a misleading report without an active term", async () => {
    m.report.mockResolvedValue({ term: null });
    expect((await GET(new Request("https://chumkosoft.com/dashboard/leave-requests/export?date=2026-11-15"))).status).toBe(409);
    expect(m.pdf).not.toHaveBeenCalled();
  });
  it("uses the authenticated advisor scope and full selected day even when list filters are present", async () => {
    const user = { id: "teacher", role: "TEACHER", staffId: "advisor" };
    const report = { term: "2/2569", teacherScoped: true, date: "2026-11-15", items: [] };
    m.report.mockResolvedValue(report); m.pdf.mockResolvedValue(new Uint8Array([37,80,68,70]));
    const response = await GET(new Request("https://chumkosoft.com/dashboard/leave-requests/export?date=2026-11-15&view=all&q=test&kind=LATE"));
    expect(m.report).toHaveBeenCalledWith(user, "2026-11-15"); expect(m.pdf).toHaveBeenCalledWith(report);
    expect(response.headers.get("Content-Type")).toBe("application/pdf"); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toContain("2026-11-15.pdf");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37,80,68,70]));
  });
});

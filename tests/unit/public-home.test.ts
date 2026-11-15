import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const decrypt = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ decryptSession: decrypt, SESSION_COOKIE_NAME: "session" }));
import proxy from "@/proxy";

beforeEach(() => { vi.clearAllMocks(); decrypt.mockResolvedValue(null); });
describe("public home route", () => {
  it.each(["/", "/guide", "/guide?role=teacher"])("opens %s without checking a session", async (path) => {
    const response = await proxy(new NextRequest(`https://chumkosoft.com${path}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(decrypt).not.toHaveBeenCalled();
  });
  it.each(["/dashboard", "/portal", "/scanner-devices", "/scan"])("keeps %s protected", async path => {
    const response = await proxy(new NextRequest(`https://chumkosoft.com${path}`));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });
});

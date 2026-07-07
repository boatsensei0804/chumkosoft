import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (fails open without Redis)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it("allows the request when Redis is not configured", async () => {
    const result = await rateLimit("test:key", 5, 60);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(5);
  });
});

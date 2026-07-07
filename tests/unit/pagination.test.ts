import { describe, it, expect } from "vitest";
import { parsePage, paginate } from "@/types/pagination";
import { fieldErrorsFromZod } from "@/utils/zod";
import { z } from "zod";

describe("parsePage", () => {
  it("defaults invalid values to 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });
  it("keeps valid page numbers", () => {
    expect(parsePage("4")).toBe(4);
  });
});

describe("paginate", () => {
  it("computes pageCount (ceil)", () => {
    expect(paginate([], 45, 1, 20).pageCount).toBe(3);
  });
  it("has at least one page even when empty", () => {
    expect(paginate([], 0, 1, 20).pageCount).toBe(1);
  });
});

describe("fieldErrorsFromZod", () => {
  it("maps the first error per field", () => {
    const schema = z.object({ a: z.string().min(1, "a-required"), b: z.number().min(0, "b-neg") });
    const result = schema.safeParse({ a: "", b: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(errors.a).toBe("a-required");
      expect(errors.b).toBe("b-neg");
    }
  });
});

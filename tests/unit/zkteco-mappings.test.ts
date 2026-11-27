import { describe, expect, it } from "vitest";
import { parsePinMappingCsv } from "@/features/faces/zkteco-pin-mapping";

describe("ZKTeco PIN mapping CSV", () => {
  it("keeps leading zeroes and accepts BOM, CRLF and quoted cells", () => {
    expect(parsePinMappingCsv('\uFEFFpin,studentCode\r\n"00421","69-0421"\r\n001,0002\r\n')).toEqual({
      rows: [{ pin: "00421", studentCode: "69-0421" }, { pin: "001", studentCode: "0002" }],
    });
  });

  it("rejects duplicate PINs across the entire file", () => {
    expect(parsePinMappingCsv("pin,studentCode\n001,ST1\n001,ST2")).toMatchObject({ error: expect.stringContaining("3") });
  });

  it("rejects malformed cells without returning partial rows", () => {
    expect(parsePinMappingCsv("pin,studentCode\n001,ST1\n2e3,ST2")).toHaveProperty("error");
    expect(parsePinMappingCsv("pin,studentCode\n001,ST1,unexpected")).toHaveProperty("error");
  });
});

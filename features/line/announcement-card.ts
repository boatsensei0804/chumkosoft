import type { LineAnnouncementKind } from "@prisma/client";
import { announcementText } from "@/features/line/announcement-text";

const FLEX_BODY_CHUNK_SIZE = 1000;

function chunks(text: string): string[] {
  const characters = Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (segment) => segment.segment);
  const parts: string[] = [];
  for (let index = 0; index < characters.length; index += FLEX_BODY_CHUNK_SIZE) {
    parts.push(characters.slice(index, index + FLEX_BODY_CHUNK_SIZE).join(""));
  }
  return parts;
}

function shortAltText(text: string): string {
  let result = "";
  for (const { segment } of new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text)) {
    if (result.length + segment.length > 400) break;
    result += segment;
  }
  return result;
}

export function announcementCard(kind: LineAnnouncementKind, title: string, body: string) {
  const emergency = kind === "EMERGENCY";
  const accent = emergency ? "#B42332" : "#1164A9";
  const label = emergency ? "แจ้งเหตุฉุกเฉิน" : "ข่าวสารจากโรงเรียน";
  const fallback = announcementText(kind, title, body);

  return {
    type: "flex" as const,
    altText: shortAltText(fallback),
    contents: {
      type: "bubble" as const,
      size: "mega",
      header: {
        type: "box" as const,
        layout: "horizontal" as const,
        spacing: "md",
        backgroundColor: accent,
        paddingAll: "18px",
        contents: [{ type: "text" as const, text: label, color: "#FFFFFF", weight: "bold", size: "md", wrap: true, flex: 1 }, { type: "image" as const, url: `https://chumkosoft.com/mascot/${emergency ? "error" : "notify"}.png`, size: "60px", aspectRatio: "1:1", aspectMode: "fit" as const, flex: 0 }],
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        paddingAll: "20px",
        spacing: "md",
        contents: [
          { type: "text" as const, text: title, color: "#18324C", weight: "bold", size: "xl", wrap: true },
          { type: "separator" as const, color: "#DCE8F2" },
          ...chunks(body).map((part) => ({ type: "text" as const, text: part, color: "#334B63", size: "md", wrap: true })),
        ],
      },
      footer: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [{ type: "text" as const, text: "CHUMKOSOFT SCHOOL", color: "#718399", size: "xs", align: "end" as const }],
      },
    },
  };
}

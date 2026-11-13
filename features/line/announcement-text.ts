import type { LineAnnouncementKind } from "@prisma/client";

export function announcementText(kind: LineAnnouncementKind, title: string, body: string): string {
  return `${kind === "EMERGENCY" ? "🚨 แจ้งเหตุฉุกเฉิน" : "📢 ข่าวสารจากโรงเรียน"}\n${title}\n\n${body}`;
}

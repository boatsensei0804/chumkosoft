import type { CardAction, FlexComponent, LeaveBubble, LineFlexMessage } from "@/features/line/flex-types";

export type LeaveCardState = "menu" | "student" | "kind" | "date" | "reason" | "review" | "pending" | "approved" | "rejected" | "empty";
const statePose: Record<LeaveCardState, string> = {
  menu: "family", student: "students", kind: "family", date: "schedule",
  reason: "working", review: "learning", pending: "notify", approved: "success", rejected: "error", empty: "empty",
};

export function leaveBubble(title: string, text: string, actions: CardAction[], tone: "brand" | "success" | "danger" = "brand", state: LeaveCardState = "menu"): LeaveBubble {
  const color = tone === "success" ? "#16836B" : tone === "danger" ? "#B42332" : "#156BB3";
  const buttons: FlexComponent[] = actions.map((action, index) => ({ type: "button", style: index === 0 ? "primary" : "secondary", height: "md", ...(index === 0 ? { color } : {}), action }));
  return {
    type: "bubble", size: "mega",
    header: { type: "box", layout: "horizontal", backgroundColor: "#EAF5FF", paddingAll: "16px", spacing: "md", contents: [
      { type: "box", layout: "vertical", flex: 1, spacing: "sm", contents: [{ type: "text", text: "CHUMKOSOFT SCHOOL", color: "#527493", size: "xxs", weight: "bold", wrap: true }, { type: "text", text: title, color, size: "lg", weight: "bold", wrap: true }] },
      { type: "image", url: `https://chumkosoft.com/mascot/${statePose[state]}.png`, size: "60px", aspectMode: "fit", aspectRatio: "1:1", flex: 0 },
    ] },
    body: { type: "box", layout: "vertical", paddingAll: "20px", spacing: "md", contents: [{ type: "text", text: text || title, color: "#243E56", size: "sm", wrap: true }] },
    ...(buttons.length ? { footer: { type: "box" as const, layout: "vertical" as const, paddingAll: "16px", spacing: "sm", contents: buttons } } : {}),
  };
}

export function leaveCard(title: string, text: string, actions: CardAction[], tone: "brand" | "success" | "danger" = "brand", state: LeaveCardState = "menu"): LineFlexMessage {
  let altText = "";
  for (const { segment } of new Intl.Segmenter("th", { granularity: "grapheme" }).segment(`${title}: ${text}`)) {
    if (altText.length + segment.length > 390) break;
    altText += segment;
  }
  return { type: "flex", altText, contents: leaveBubble(title, text, actions, tone, state) };
}

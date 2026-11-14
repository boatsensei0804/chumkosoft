import type { LineQuickReplyAction } from "@/lib/line";
export type CardAction = LineQuickReplyAction | { type: "uri"; label: string; uri: string };
export interface FlexComponent {
  type: "box" | "text" | "button" | "image" | "separator";
  layout?: "vertical" | "horizontal";
  contents?: FlexComponent[];
  text?: string; color?: string; backgroundColor?: string;
  size?: string; weight?: "bold"; wrap?: boolean;
  paddingAll?: string; spacing?: string; margin?: string;
  flex?: number; url?: string; aspectMode?: "fit" | "cover"; aspectRatio?: string;
  action?: CardAction; style?: "primary" | "secondary" | "link"; height?: "sm" | "md";
}
export interface LeaveBubble { type: "bubble"; size: "mega"; header: FlexComponent; body: FlexComponent; footer?: FlexComponent }
export interface LineFlexMessage { type: "flex"; altText: string; contents: LeaveBubble | { type: "carousel"; contents: LeaveBubble[] } }

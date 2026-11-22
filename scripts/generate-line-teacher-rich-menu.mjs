import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ChartNoAxesColumnIncreasing, ChevronRight, ClipboardCheck, Inbox, MessageCircle, CalendarDays } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

const output = new URL("../public/line/rich-menu-teacher.png", import.meta.url);
const { rows } = JSON.parse(await readFile(new URL("./line-teacher-menu.json", import.meta.url), "utf8"));
const width = 2500;
const rowHeight = 843;
const height = rows.length * rowHeight;
const styles = [
  [
    { icon: ClipboardCheck, accent: "#0862b8", soft: "#e0f3ff", ink: "#0c376c", art: "staff.png", surface: "url(#attendance)" },
    { icon: Inbox, accent: "#533baa", soft: "#eae4ff", ink: "#342568", art: "notify.png", surface: "url(#requests)" },
  ],
  [
    { icon: CalendarDays, accent: "#0862b8", soft: "#e0f2ff", ink: "#143963", surface: "#f7fbff" },
    { icon: ChartNoAxesColumnIncreasing, accent: "#086e84", soft: "#dcf5f8", ink: "#113d5a", surface: "#f5fbff" },
    { icon: MessageCircle, accent: "#13764d", soft: "#ddf5e8", ink: "#164f3e", surface: "#f5fcf9" },
  ],
];

function iconMarkup(Icon, size, color) {
  return renderToStaticMarkup(createElement(Icon, { size, color, strokeWidth: 1.8 }));
}

const tiles = rows.flatMap((row, rowIndex) => row.map(({ label, description }, column) => {
  const left = Math.floor(column * width / row.length);
  const right = Math.floor((column + 1) * width / row.length);
  const tileWidth = right - left - 52;
  const topRow = rowIndex === 0;
  const titleLines = label === "ตารางสอนของฉัน" ? ["ตารางสอน", "ของฉัน"] : [label];
  const titleSize = topRow ? 122 : 100;
  const { icon, accent, soft, ink, surface } = styles[rowIndex][column];
  return `
    <g transform="translate(${left + 26},${rowIndex * rowHeight + 26})">
      <rect x="3" y="3" width="${tileWidth - 6}" height="785" rx="82" fill="${surface}" stroke="#cbdff3" stroke-width="6"/>
      <rect x="76" y="76" width="${topRow ? 218 : 206}" height="${topRow ? 218 : 206}" rx="65" fill="${soft}" stroke="#ffffff" stroke-width="6"/>
      <g transform="translate(${topRow ? 125 : 119},${topRow ? 125 : 119})">${iconMarkup(icon, 120, accent)}</g>
      <text x="76" y="${topRow ? 552 : 488}" fill="${ink}" font-family="Thonburi, Prompt, sans-serif" font-weight="700" font-size="${titleSize}">
        ${titleLines.map((line, index) => `<tspan x="76" dy="${index * 121}">${line}</tspan>`).join("")}
      </text>
      ${topRow ? `<text x="80" y="682" fill="${ink}" font-family="Thonburi, Prompt, sans-serif" font-size="72">${description}</text>` : ""}
      <g transform="translate(${tileWidth - 140},632)">${iconMarkup(ChevronRight, 76, accent)}</g>
    </g>
  `;
})).join("");

const svg = Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="attendance" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop stop-color="#f6fcff"/><stop offset="1" stop-color="#c6e8ff"/>
  </linearGradient>
  <linearGradient id="requests" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop stop-color="#fcfaff"/><stop offset="1" stop-color="#e1dcff"/>
  </linearGradient>
</defs>
<rect width="${width}" height="${height}" fill="#dfeefa"/>
${tiles}</svg>`);

const mascots = await Promise.all(styles[0].map(async ({ art }, column) => ({
  input: await sharp(new URL(`../public/mascot/${art}`, import.meta.url).pathname)
    .resize({ width: 430, height: 385, fit: "inside" }).toBuffer(),
  left: column * 1250 + 727,
  top: 68,
})));

await mkdir(new URL("../public/line/", import.meta.url), { recursive: true });
await sharp(svg)
  .composite(mascots)
  .png({ palette: true, effort: 10 })
  .toFile(fileURLToPath(output));

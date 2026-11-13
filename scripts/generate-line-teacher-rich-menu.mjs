import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const output = new URL("../public/line/rich-menu-teacher.png", import.meta.url);
const mascot = new URL("../public/mascot/staff.png", import.meta.url);
const labels = [
  ["01", "เช็กชื่อ", "บันทึกและตรวจสถานะ"],
  ["02", "คำขอลา", "ตรวจและอนุมัติ"],
  ["03", "ตารางสอน", "ดูคาบเรียนของครู"],
  ["04", "สรุปวันนี้", "ภาพรวมชั้นเรียน"],
  ["05", "LINE ของฉัน", "ตรวจบัญชีที่เชื่อม"],
  ["06", "แจ้งลา", "สำหรับครูที่เป็นผู้ปกครอง"],
];
const tiles = labels.map(([number, title, subtitle], index) => {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = column * 833 + 30;
  const y = row * 843 + 30;
  const dark = index === 0 || index === 3;
  const fill = dark ? "#0d6fbc" : "#e7f5ff";
  const titleColor = dark ? "#ffffff" : "#125b98";
  const subtitleColor = dark ? "#dcefff" : "#56768e";
  const pillFill = dark ? "#ffffff" : "#b9e1fb";
  const pillText = dark ? "#0d6fbc" : "#125b98";
  const titleSize = title.length > 8 ? 83 : 105;
  return `
  <rect x="${x}" y="${y}" width="773" height="783" rx="72" fill="${fill}"/>
  <rect x="${x + 54}" y="${y + 54}" width="135" height="82" rx="41" fill="${pillFill}"/>
  <text x="${x + 121}" y="${y + 111}" text-anchor="middle" fill="${pillText}" font-family="Prompt, Thonburi, sans-serif" font-weight="700" font-size="51">${number}</text>
  <text x="${x + 58}" y="${y + 469}" fill="${titleColor}" font-family="Prompt, Thonburi, sans-serif" font-weight="700" font-size="${titleSize}">${title}</text>
  <text x="${x + 61}" y="${y + 581}" fill="${subtitleColor}" font-family="Prompt, Thonburi, sans-serif" font-size="54">${subtitle}</text>
  <path d="M${x + 58} ${y + 677}h${dark ? 205 : 145}m-37-37 37 37-37 37" fill="none" stroke="${titleColor}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
}).join("");

const svg = Buffer.from(`<svg width="2500" height="1686" viewBox="0 0 2500 1686" xmlns="http://www.w3.org/2000/svg">
<rect width="2500" height="1686" fill="#f5fbff"/>${tiles}</svg>`);

await mkdir(new URL("../public/line/", import.meta.url), { recursive: true });
await sharp(svg)
  .composite([{ input: await sharp(fileURLToPath(mascot)).resize({ width: 330 }).toBuffer(), left: 475, top: 80 }])
  .png({ palette: true, effort: 10 })
  .toFile(fileURLToPath(output));

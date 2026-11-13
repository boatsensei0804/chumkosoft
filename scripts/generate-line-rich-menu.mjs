import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const width = 2500;
const height = 843;
const output = new URL("../public/line/rich-menu-leave.png", import.meta.url);
const mascot = new URL("../public/mascot/family.png", import.meta.url);

const background = Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eff9ff"/>
      <stop offset="1" stop-color="#cceaff"/>
    </linearGradient>
    <linearGradient id="button" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1489d4"/>
      <stop offset="1" stop-color="#0861ae"/>
    </linearGradient>
  </defs>
  <rect width="2500" height="843" fill="url(#sky)"/>
  <circle cx="452" cy="426" r="385" fill="#d9f0ff"/>
  <circle cx="452" cy="426" r="328" fill="#f9fdff"/>
  <rect x="900" y="91" width="1490" height="661" rx="95" fill="#ffffff"/>
  <rect x="944" y="135" width="1402" height="573" rx="78" fill="url(#button)"/>
  <text x="1064" y="269" fill="#d8efff" font-family="Prompt, Thonburi, sans-serif" font-weight="600" font-size="62" letter-spacing="3">CHUMKOSOFT SCHOOL</text>
  <text x="1060" y="459" fill="#ffffff" font-family="Prompt, Thonburi, sans-serif" font-weight="700" font-size="158">แจ้งลา</text>
  <text x="1068" y="580" fill="#e5f4ff" font-family="Prompt, Thonburi, sans-serif" font-size="68">แตะเพื่อเลือกวันและส่งคำขอ</text>
  <circle cx="2210" cy="430" r="75" fill="#ffffff" fill-opacity="0.23"/>
  <path d="M2182 430h57m-27-27 27 27-27 27" fill="none" stroke="#ffffff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

await mkdir(new URL("../public/line/", import.meta.url), { recursive: true });
await sharp(background)
  .composite([{ input: await sharp(fileURLToPath(mascot)).resize({ width: 650 }).toBuffer(), left: 126, top: 91 }])
  .png({ palette: true, effort: 10 })
  .toFile(fileURLToPath(output));

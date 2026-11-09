import SectionCard from "./section-card";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import type { EnrolmentPoint } from "../types";

const W = 640;
const H = 220;
const PAD_X = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 34;

function buildChart(data: EnrolmentPoint[]): {
  linePath: string;
  areaPath: string;
  points: { x: number; y: number; label: string; value: number }[];
} {
  const values = data.map((p) => p.value);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const span = max - min || 1;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const divisor = data.length > 1 ? data.length - 1 : 1;

  const points = data.map((p, i) => {
    const x = PAD_X + (innerW * i) / divisor;
    const y = PAD_TOP + innerH * (1 - (p.value - min) / span);
    return { x, y, label: p.month, value: p.value };
  });

  const linePath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  const areaPath =
    `M ${points[0].x.toFixed(1)} ${(H - PAD_BOTTOM).toFixed(1)} ` +
    points.map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ") +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(H - PAD_BOTTOM).toFixed(1)} Z`;

  return { linePath, areaPath, points };
}

export default function EnrolmentTrend({ data }: { data: EnrolmentPoint[] }): React.ReactNode {
  const total = data.reduce((sum, p) => sum + p.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <SectionCard title="แนวโน้มการลงทะเบียน" caption="การลงทะเบียนใหม่รายเดือน · 6 เดือนล่าสุด" bodyClassName="p-6">
        <MascotEmptyState title="ยังไม่มีข้อมูลการลงทะเบียน" description="กราฟจะปรากฏเมื่อมีการลงทะเบียนนักเรียนในช่วง 6 เดือนที่ผ่านมา" compact />
      </SectionCard>
    );
  }

  const { linePath, areaPath, points } = buildChart(data);
  const last = points[points.length - 1];
  const gridY = [PAD_TOP, PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2, H - PAD_BOTTOM];

  return (
    <SectionCard
      title="แนวโน้มการลงทะเบียน"
      caption="การลงทะเบียนใหม่รายเดือน · 6 เดือนล่าสุด"
      action={
        <span className="tabular rounded-lg px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
          รวม {total.toLocaleString("th-TH")} คน
        </span>
      }
      bodyClassName="px-2 pb-2 pt-4"
    >
      <figure className="m-0">
        <figcaption className="sr-only">
          กราฟแสดงจำนวนการลงทะเบียนใหม่รายเดือน รวม {total} รายการในช่วง 6 เดือนล่าสุด
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="enrolFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridY.map((y) => (
            <line key={y} x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />
          ))}

          <path d={areaPath} fill="url(#enrolFill)" />
          <path d={linePath} fill="none" stroke="var(--brand-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((pt) => (
            <g key={pt.label}>
              {pt === last ? (
                <>
                  <circle cx={pt.x} cy={pt.y} r="6.5" fill="var(--brand)" opacity="0.2" />
                  <circle cx={pt.x} cy={pt.y} r="4" fill="var(--brand-strong)" stroke="var(--bg)" strokeWidth="2" />
                </>
              ) : (
                <circle cx={pt.x} cy={pt.y} r="3" fill="var(--bg)" stroke="var(--brand-strong)" strokeWidth="1.75" />
              )}
              <text x={pt.x} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--muted)" className="tabular">
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </figure>
    </SectionCard>
  );
}

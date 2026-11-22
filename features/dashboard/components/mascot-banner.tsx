import Image from "next/image";
import type { ReactNode } from "react";
import Mascot, { type MascotPose } from "@/components/ui/mascot";
import type { LucideIcon } from "lucide-react";

interface MascotBannerProps {
  title: string;
  subtitle?: string;
  category: string;
  pose: MascotPose;
  icon?: LucideIcon;
  illustration?: string;
  scene?: string;
  actions?: ReactNode;
  compact?: boolean;
}

export default function MascotBanner({ title, subtitle, category, pose, icon: Icon, illustration, scene, actions, compact = false }: MascotBannerProps): ReactNode {
  return <div className="mb-4">
  <header className={`relative flex min-h-[132px] overflow-hidden rounded-[24px] border border-school-panel-border bg-linear-to-r from-school-panel via-school-panel-tint to-school-panel-wash shadow-school-panel ${compact ? "min-h-[116px]" : "sm:min-h-[158px]"}`}>
    {scene ? (
      <div className="pointer-events-none absolute top-1/2 right-0 aspect-[3/1] w-[72%] max-w-[550px] -translate-y-1/2 opacity-20 [mask-image:linear-gradient(to_right,transparent,black_42%)] sm:w-[48%] sm:opacity-100">
        <Image src={scene} alt="" fill sizes="(min-width: 1280px) 520px, (min-width: 640px) 48vw, 72vw" className="object-contain object-right" />
      </div>
    ) : <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-4 size-48 rounded-full border-[26px] border-white/35" />}
    <div className={`relative z-10 flex min-w-0 flex-1 flex-col justify-center px-4 py-4 sm:px-6 ${scene ? "sm:max-w-[58%]" : ""}`}>
      <p className="text-[11px] font-bold tracking-wide text-[#1769b3]">{category}</p>
      <h1 className={`mt-1 flex items-center gap-3 font-extrabold leading-tight tracking-tight text-[#0b315f] ${compact ? "text-[22px] sm:text-[27px]" : "text-[24px] sm:text-[32px]"}`}>{Icon && <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/80 bg-white/75 text-[#0875cf] shadow-sm sm:size-10"><Icon aria-hidden="true" className="size-5 sm:size-6" /></span>}{title}</h1>
      {subtitle && <p className={`mt-1 text-[13px] leading-5 text-[#365b80] sm:text-sm ${scene ? "" : "sm:max-w-[720px]"}`}>{subtitle}</p>}
    </div>
    {!scene && <div className="relative flex w-[76px] shrink-0 items-end justify-center overflow-hidden sm:w-[160px] lg:w-[220px]">
      {illustration ? <Image src={illustration} alt="" width={196} height={196} className="absolute -bottom-2 -right-4 h-[96px] w-[96px] object-contain sm:-bottom-7 sm:right-1 sm:h-[175px] sm:w-[175px] lg:right-4 lg:h-[205px] lg:w-[205px]" priority /> : <Mascot pose={pose} size={190} decorative className="absolute -bottom-2 -right-4 h-[96px] w-[96px] sm:-bottom-6 sm:right-2 sm:h-[190px] sm:w-[190px]" priority />}
    </div>}
  </header>
  {actions && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[18px] border border-school-panel-border bg-school-panel px-3 py-2 shadow-school-panel">{actions}</div>}
  </div>;
}

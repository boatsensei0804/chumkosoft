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
  <header className={`relative flex min-h-[132px] overflow-hidden rounded-[24px] border border-[#c9e4ff] bg-gradient-to-r from-[#f6fbff] via-[#e9f5ff] to-[#bdddff] shadow-[0_8px_24px_#225a9a12] ${compact ? "min-h-[116px]" : "sm:min-h-[158px]"}`}>
    {scene ? <><Image src={scene} alt="" fill priority sizes="(min-width: 1280px) 1000px, 100vw" className="pointer-events-none object-cover object-right md:object-contain md:object-right" /><div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/15 md:from-white/65 md:via-white/30 md:to-transparent" /></> : <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-4 size-48 rounded-full border-[26px] border-white/35" />}
    <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center px-5 py-4 sm:px-7">
      <p className="text-[11px] font-bold tracking-wide text-[#1769b3]">{category}</p>
      <h1 className={`mt-1 flex items-center gap-3 font-extrabold leading-tight tracking-tight text-[#0b315f] ${compact ? "text-[22px] sm:text-[27px]" : "text-[26px] sm:text-[34px]"}`}>{Icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/80 bg-white/75 text-[#0875cf] shadow-sm sm:size-11"><Icon aria-hidden="true" className="size-5 sm:size-6" /></span>}{title}</h1>
      {subtitle && <p className={`mt-1 text-[13px] leading-5 text-[#365b80] sm:text-sm ${scene ? "max-w-full sm:max-w-[64%]" : "max-w-full sm:max-w-[720px]"}`}>{subtitle}</p>}
    </div>
    {!scene && <div className="relative flex w-[76px] shrink-0 items-end justify-center overflow-hidden sm:w-[160px] lg:w-[220px]">
      {illustration ? <Image src={illustration} alt="" width={196} height={196} className="absolute -bottom-2 -right-4 h-[96px] w-[96px] object-contain sm:-bottom-7 sm:right-1 sm:h-[175px] sm:w-[175px] lg:right-4 lg:h-[205px] lg:w-[205px]" priority /> : <Mascot pose={pose} size={190} decorative className="absolute -bottom-2 -right-4 h-[96px] w-[96px] sm:-bottom-6 sm:right-2 sm:h-[190px] sm:w-[190px]" priority />}
    </div>}
  </header>
  {actions && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[18px] border border-blue-100 bg-white px-3 py-2 shadow-[0_5px_16px_#225a9a0b]">{actions}</div>}
  </div>;
}

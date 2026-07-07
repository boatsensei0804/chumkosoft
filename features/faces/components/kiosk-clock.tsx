"use client";

import { useEffect, useState } from "react";

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: "Asia/Bangkok", weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Live Bangkok-time clock for the scan kiosk. Renders after mount to avoid an SSR mismatch. */
export default function KioskClock(): React.ReactNode {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Defer the first tick to a callback (not the effect body) so state updates
    // never run synchronously during the effect (react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="text-center" aria-live="off">
      <p className="tabular text-[44px] font-bold leading-none tracking-tight text-ink-strong sm:text-[56px]" suppressHydrationWarning>
        {now ? timeFmt.format(now) : "--:--:--"}
      </p>
      <p className="mt-1.5 text-[13.5px] text-muted" suppressHydrationWarning>
        {now ? dateFmt.format(now) : ""}
      </p>
    </div>
  );
}

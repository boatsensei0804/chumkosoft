import BrandMark from "@/features/dashboard/components/brand-mark";
import Icon from "@/features/dashboard/components/icon";
import { logoutAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/lib/dal";

/** Slim top bar for the self-service portal: brand, viewer identity, sign out. */
export default function PortalHeader({ user }: { user: CurrentUser }): React.ReactNode {
  return (
    <header
      className="sticky top-0 z-10 flex h-16 items-center gap-3 px-4 sm:px-6"
      style={{
        backgroundColor: "color-mix(in oklch, var(--bg) 85%, transparent)",
        backdropFilter: "saturate(1.4) blur(8px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <BrandMark />

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-[13px] font-semibold text-ink-strong leading-tight">{user.displayName}</p>
          <p className="text-[12px] text-muted leading-tight">{user.subtitle}</p>
        </div>
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold"
          style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}
          aria-hidden="true"
        >
          {user.initials}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
            className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="logout" sx={{ fontSize: 19 }} />
          </button>
        </form>
      </div>
    </header>
  );
}

import Mascot from "@/components/ui/mascot";

interface LoadingBannerProps {
  title: string;
  description: string;
}

export default function LoadingBanner({ title, description }: LoadingBannerProps): React.ReactNode {
  return (
    <section
      role="status"
      aria-live="polite"
      className="relative isolate overflow-hidden rounded-2xl border border-nav-line bg-nav-surface px-5 py-5 text-nav-ink sm:px-7 sm:py-6"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/15 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-4 sm:gap-6">
        <Mascot pose="working" size={104} decorative className="hidden size-24 sm:block" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-nav-muted">{description}</p>
          <div
            role="progressbar"
            aria-label="กำลังโหลดข้อมูล"
            aria-valuetext="กำลังโหลด"
            className="mt-4 h-2 w-full max-w-72 overflow-hidden rounded-full bg-white/20"
          >
            <div className="loading-progress-bar h-full w-[35%] rounded-full bg-sky-200" />
          </div>
        </div>
      </div>
    </section>
  );
}

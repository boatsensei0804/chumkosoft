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
      className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-[#183763] to-[#28679e] px-6 py-8 text-white shadow-md sm:px-8 sm:py-10"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/15 blur-2xl" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
        <Mascot pose="working" size={144} decorative priority className="drop-shadow-lg" />
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200">CHUMKOSOFT</p>
        <h1 className="mt-2 text-xl font-bold leading-tight sm:text-[27px]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-sky-100">{description}</p>
        <div
          role="progressbar"
          aria-label="กำลังโหลดข้อมูล"
          aria-valuetext="กำลังโหลด"
          className="mt-6 h-2 w-full max-w-72 overflow-hidden rounded-full bg-white/20"
        >
          <div className="loading-progress-bar h-full w-[35%] rounded-full bg-sky-200" />
        </div>
        <p className="mt-2 text-xs text-sky-100">โปรดรอสักครู่</p>
      </div>
    </section>
  );
}

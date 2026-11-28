import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, ChevronDown, HeartHandshake, MessageCircle, ShieldCheck } from "lucide-react";
import BrandScene from "@/components/ui/brand-scene";
import { Button } from "@/components/ui/button";
import BrandMark from "@/features/dashboard/components/brand-mark";
import HomeGuide from "@/features/guide/components/home-guide";

export const metadata: Metadata = {
  title: "Chumkosoft — เชื่อมโรงเรียนกับครอบครัว",
  description: "เชื่อมการดูแลนักเรียนระหว่างโรงเรียน ครู และผู้ปกครอง ด้วยระบบเช็คชื่อ แจ้งเตือนผ่าน LINE และแจ้งลาในที่เดียว",
};

const features = [
  { icon: CalendarCheck2, title: "ติดตามการมาเรียน", description: "ครูเช็คชื่อรายคาบ ดูเวลาเข้าโรงเรียน และติดตามสถานะของนักเรียนแยกตามห้อง" },
  { icon: MessageCircle, title: "รับข่าวสารผ่าน LINE", description: "ผู้ปกครองที่ผูกบัญชีกับนักเรียนรับประกาศและการแจ้งเตือนจาก LINE OA ของโรงเรียน" },
  { icon: HeartHandshake, title: "แจ้งลาและขอมาสาย", description: "ผู้ปกครองส่งคำขอผ่าน LINE และติดตามผลหลังครูที่ปรึกษาพิจารณา" },
];

const steps = [
  { title: "รับรหัสจากโรงเรียน", text: "ขอรหัสเชื่อมบัญชีของบุตรหลานจากครูที่ปรึกษาหรือเจ้าหน้าที่" },
  { title: "เพิ่มเพื่อน LINE OA", text: "ใช้ QR หรือลิงก์ที่โรงเรียนให้ แล้วส่งรหัสเชื่อมบัญชีในแชท" },
  { title: "รับข่าวและส่งคำขอ", text: "เปิดเมนูใน LINE เพื่อรับข่าว แจ้งลา หรือขอมาสาย หากมีลูกหลายคน ให้ผูกบัญชีด้วยรหัสของแต่ละคน" },
];

const questions = [
  { title: "ผู้ปกครองต้องเข้าสู่ระบบเว็บไซต์ไหม?", answer: "รับข่าวและแจ้งลาผ่าน LINE OA หลังผูกบัญชีด้วยรหัสจากโรงเรียนได้เลย หากต้องเปิดเว็บไซต์ ให้ใช้บัญชีที่โรงเรียนจัดให้" },
  { title: "มีลูกมากกว่าหนึ่งคน ใช้ LINE เดียวได้ไหม?", answer: "ได้ค่ะ ส่งรหัสเชื่อมบัญชีของลูกแต่ละคนในแชท LINE OA เดียวกัน แล้วเลือกชื่อบุตรหลานเมื่อส่งคำขอ" },
  { title: "แจ้งลาแล้วจะทราบผลเมื่อไร?", answer: "คำขอจะส่งให้ครูที่ปรึกษาพิจารณา ผู้ปกครองตรวจผลได้ใน LINE โดยดูชื่อบุตรหลานและวันที่ของคำขอ" },
  { title: "ลืมบัญชีหรือผูก LINE ผิดคน ต้องทำอย่างไร?", answer: "ติดต่อครูที่ปรึกษาหรือผู้ดูแลระบบของโรงเรียนเพื่อตรวจสอบบัญชีและขอความช่วยเหลือ" },
];

const frame = "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12";
const navLink = "min-h-11 items-center rounded-lg px-2.5 text-sm font-medium text-ink hover:bg-surface-2 hover:text-brand-ink";

export default function Home(): React.ReactNode {
  return (
    <div className="min-h-dvh bg-card text-ink">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:start-4 focus:top-4">ข้ามไปเนื้อหาหลัก</a>
      <header className="border-b border-line bg-card">
        <div className={`${frame} flex flex-wrap items-center justify-between gap-2 py-3`}>
          <Link href="/" aria-label="Chumkosoft หน้าแรก" className="rounded-lg"><BrandMark /></Link>
          <nav aria-label="เมนูหลัก" className="flex items-center gap-1 sm:gap-3">
            <a href="#manual" className={`${navLink} hidden sm:inline-flex`}>คู่มือใช้งาน</a>
            <a href="#families" className={`${navLink} hidden md:inline-flex`}>สำหรับผู้ปกครอง</a>
            <Button asChild size="lg" className="min-h-11"><Link href="/login">เข้าสู่ระบบ <ArrowRight aria-hidden="true" /></Link></Button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section aria-labelledby="home-title" className={`${frame} pt-5 pb-8 sm:pt-8 sm:pb-12`}>
          <div className="relative isolate overflow-hidden rounded-[24px] bg-nav-surface text-nav-ink lg:min-h-[510px]">
            <div className="relative z-10 px-6 pt-8 pb-7 sm:px-9 sm:py-10 lg:w-[55%] lg:px-12 lg:pt-23">
              <h1 id="home-title" className="text-balance text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold leading-[1.19] tracking-[-0.025em]">
                ดูแลการมาเรียน <span className="block text-sky-accent">จากโรงเรียนถึงบ้าน</span>
              </h1>
              <p className="mt-4 max-w-[39ch] text-pretty text-base leading-8 text-nav-muted sm:text-lg">
                ครูเช็คชื่อและติดตามการเข้าเรียน ผู้ปกครองรับข่าว แจ้งลา หรือขอมาสายผ่าน LINE ของโรงเรียน
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Button asChild size="lg" className="min-h-12 bg-white text-brand-ink hover:bg-sky-accent active:bg-sky-accent-soft focus-visible:ring-sky-accent">
                  <Link href="/login">เข้าสู่ระบบโรงเรียน <ArrowRight aria-hidden="true" /></Link>
                </Button>
                <a href="#manual" className="inline-flex min-h-11 items-center rounded-sm font-semibold text-white underline decoration-sky-accent/60 underline-offset-4 hover:decoration-white focus-visible:outline-sky-accent">เปิดคู่มือใช้งาน</a>
              </div>
            </div>
            <div className="relative aspect-[16/10] sm:aspect-[2/1] lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%] lg:aspect-auto">
              <BrandScene priority />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-nav-surface via-transparent via-35% lg:bg-linear-to-r lg:via-45%" />
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="features-title" className="border-y border-line bg-surface">
          <div className={`${frame} py-9 sm:py-12`}>
            <h2 id="features-title" className="mb-6 text-2xl font-bold text-ink-strong sm:text-3xl">เช็คชื่อ รับข่าว และแจ้งลา</h2>
            <ul className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
              {features.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex min-w-0 gap-4 py-5 first:pt-0 last:pb-0 md:flex-col md:py-0 md:pe-5 md:ps-5 md:first:ps-0 md:last:pe-0">
                  <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-brand md:mt-0 md:size-6" />
                  <div>
                    <h3 className="text-lg font-semibold text-ink-strong">{title}</h3>
                    <p className="mt-2 max-w-[35ch] text-sm leading-7 text-muted">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="families" aria-labelledby="families-title" className={`${frame} scroll-mt-6 py-12 sm:py-16`}>
          <div className="grid gap-7 rounded-2xl bg-ink-strong p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:p-10">
            <div>
              <h2 id="families-title" className="max-w-[16ch] text-2xl font-bold leading-tight sm:text-3xl">เชื่อม LINE ของผู้ปกครอง</h2>
              <p className="mt-3 max-w-[38ch] text-sm leading-7 text-white/85">ใช้บัญชี LINE เดียวรับข่าวจากโรงเรียนและติดตามคำขอของบุตรหลานได้</p>
              <Link href="/guide?role=parent" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sky-accent underline-offset-4 hover:underline">
                คู่มือผู้ปกครอง <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <ol className="divide-y divide-white/20 border-t border-white/20 lg:border-t-0">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 py-4 last:pb-0 lg:first:pt-0">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-accent font-semibold text-ink-strong">{index + 1}</span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-7 text-white/85">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="border-y border-line bg-card pb-10 sm:pb-14">
          <HomeGuide />
          <div className="mx-auto max-w-6xl px-5 pt-5 sm:px-8">
            <Link href="/guide?role=teacher" className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-brand-ink underline-offset-4 hover:underline">
              เปิดคู่มือครู <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <section aria-labelledby="faq-title" className={`${frame} grid gap-7 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] lg:gap-12`}>
          <h2 id="faq-title" className="text-2xl font-bold text-ink-strong sm:text-3xl">คำถามที่พบบ่อย</h2>
          <div className="divide-y divide-line border-y border-line">
            {questions.map(({ title, answer }) => (
              <details key={title} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-sm font-semibold text-ink-strong hover:text-brand [&::-webkit-details-marker]:hidden">
                  {title}
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-brand motion-safe:transition-transform group-open:rotate-180" />
                </summary>
                <p className="max-w-[60ch] pb-4 pe-6 text-sm leading-7 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-card">
        <div className={`${frame} flex flex-col justify-between gap-4 py-6 text-sm text-muted sm:flex-row sm:items-center`}>
          <Link href="/" aria-label="Chumkosoft หน้าแรก" className="w-fit rounded-lg"><BrandMark /></Link>
          <p className="flex max-w-[44ch] items-start gap-2 leading-relaxed">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
            ข้อมูลนักเรียนเปิดดูได้เฉพาะบัญชีที่ได้รับสิทธิ์จากโรงเรียน
          </p>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, ChevronDown, GraduationCap, HeartHandshake, MessageCircle, ShieldCheck } from "lucide-react";
import Mascot from "@/components/ui/mascot";
import HomeGuide from "@/features/guide/components/home-guide";

export const metadata: Metadata = {
  title: "Chumkosoft — เชื่อมโรงเรียนกับครอบครัว",
  description: "เชื่อมการดูแลนักเรียนระหว่างโรงเรียน ครู และผู้ปกครอง ด้วยระบบเช็คชื่อ แจ้งเตือนผ่าน LINE และแจ้งลาในที่เดียว",
};

const features = [
  { icon: CalendarCheck2, title: "ทุกการมาเรียน ดูได้ชัดเจน", description: "ดูปฏิทินเช็คชื่อ สรุปรายห้อง และสถานะรายบุคคล ช่วยให้ครูติดตามนักเรียนได้สะดวกขึ้น", tags: "เช็คชื่อ · เวลาเข้าโรงเรียน · สรุปการมาเรียน" },
  { icon: MessageCircle, title: "ข่าวจากโรงเรียน ถึงครอบครัว", description: "รับการแจ้งเตือนและประกาศผ่าน LINE OA ของโรงเรียน เมื่อผูกบัญชีกับข้อมูลนักเรียนแล้ว", tags: "แจ้งเตือน LINE · ประกาศ · เชื่อมบัญชี" },
  { icon: HeartHandshake, title: "แจ้งลา ครูรับรู้และดูแลต่อ", description: "ผู้ปกครองเลือกบุตรหลานและแจ้งลาหรือขอมาสายผ่าน LINE ส่งคำขอให้ครูที่ปรึกษาพิจารณา", tags: "ลาป่วย · ลากิจ · ขอมาสายล่วงหน้า" },
];
const steps = [
  { title: "รับรหัสจากโรงเรียน", text: "ติดต่อครูที่ปรึกษาหรือเจ้าหน้าที่ เพื่อรับรหัสเชื่อมบัญชีของบุตรหลาน" },
  { title: "เพิ่มเพื่อน LINE OA", text: "ใช้ QR หรือลิงก์ในเอกสารที่โรงเรียนให้ แล้วส่งรหัสในแชทเพื่อผูกบัญชี" },
  { title: "รับข่าวสารและแจ้งลา", text: "ใช้เมนูใน LINE เพื่อดูข้อมูลหรือแจ้งลา หากมีลูกหลายคน ให้ผูกบัญชีด้วยรหัสของแต่ละคน" },
];
const questions = [
  { title: "ผู้ปกครองต้องเข้าสู่ระบบเว็บไซต์ไหม?", answer: "สำหรับการรับแจ้งเตือนและแจ้งลาผ่าน LINE ให้เพิ่มเพื่อน LINE OA และผูกบัญชีด้วยรหัสที่โรงเรียนออกให้ก่อน หากต้องใช้เว็บไซต์ ให้ใช้บัญชีที่โรงเรียนจัดให้" },
  { title: "มีลูกมากกว่าหนึ่งคน ใช้ LINE เดียวได้ไหม?", answer: "ได้ค่ะ ส่งรหัสเชื่อมบัญชีของลูกแต่ละคนผ่านแชท LINE OA เดียวกัน และเลือกชื่อบุตรหลานให้ถูกต้องก่อนส่งคำขอลา" },
  { title: "แจ้งลาแล้วถือว่าอนุมัติทันทีหรือไม่?", answer: "คำขอจะส่งให้ครูที่ปรึกษาพิจารณาก่อน ผู้ปกครองควรติดตามผลอนุมัติใน LINE และตรวจสอบวันที่กับชื่อบุตรหลานทุกครั้ง" },
  { title: "ลืมบัญชีหรือผูก LINE ผิดคน ต้องทำอย่างไร?", answer: "ติดต่อครูที่ปรึกษาหรือผู้ดูแลระบบของโรงเรียนเพื่อตรวจสอบและแก้ไข ไม่ควรส่งรหัสผ่าน รหัส OTP หรือข้อมูลส่วนตัวในพื้นที่สาธารณะ" },
];
const primaryButton = "inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-strong";

export default function Home(): React.ReactNode {
  return (
    <div className="min-h-dvh bg-white text-ink">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">ข้ามไปเนื้อหาหลัก</a>
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Chumkosoft หน้าแรก" className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white"><GraduationCap className="size-6" aria-hidden="true" /></span>
            <span><span className="block text-lg font-bold tracking-tight text-brand-ink">chumkosoft<span className="text-sky-500">.</span></span><span className="block text-[10px] text-muted">โรงเรียนที่เชื่อมถึงกัน</span></span>
          </Link>
          <nav aria-label="เมนูหลัก" className="flex items-center gap-5 text-sm font-medium">
            <a href="#manual" className="text-muted hover:text-brand">คู่มือ<span className="hidden sm:inline">ใช้งาน</span></a>
            <a href="#families" className="hidden text-muted hover:text-brand md:block">สำหรับผู้ปกครอง</a>
            <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong">เข้าสู่ระบบ <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <section aria-labelledby="home-title" className="relative overflow-hidden bg-[#f0f7ff]">
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-12 pt-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-20">
            <div>
              <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-ink"><span className="size-2 rounded-full bg-sky-500" /> CHUMKOSOFT SCHOOL WORKSPACE</p>
              <h1 id="home-title" className="text-[clamp(2rem,4.5vw,3.6rem)] font-bold leading-[1.35] tracking-tight text-[#173b67]">ใกล้ชิดทุกการมาเรียน<br /><span className="text-brand">เชื่อมถึงกันทุกวัน</span></h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-muted sm:text-lg">พื้นที่กลางของโรงเรียน ครู และครอบครัว<br className="hidden sm:block" /> ให้การเช็คชื่อ การแจ้งข่าว และการดูแลนักเรียน<br className="hidden lg:block" /> เป็นเรื่องที่ติดตามได้ง่ายขึ้น</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className={primaryButton}>เข้าสู่ระบบโรงเรียน <ArrowRight className="size-4" aria-hidden="true" /></Link>
                <a href="#manual" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-blue-200 bg-white px-6 text-sm font-semibold text-brand-ink hover:bg-blue-50">ฉันเป็นผู้ปกครอง <ChevronDown className="size-4" aria-hidden="true" /></a>
              </div>
              <p className="mt-5 text-xs leading-6 text-muted">ครูและเจ้าหน้าที่ใช้บัญชีที่โรงเรียนออกให้</p>
            </div>
            <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center justify-center py-4 lg:py-8">
              <div aria-hidden="true" className="absolute top-4 aspect-square w-[85%] rounded-full bg-white/80" />
              <Mascot pose="welcome" size={360} priority className="relative h-auto w-[min(80%,340px)] drop-shadow-lg" />
              <div className="relative -mt-2 w-full rounded-2xl border border-white bg-white/95 p-4 shadow-[0_12px_36px_#215b9820] sm:p-5">
                <p className="mb-3 text-xs font-semibold text-brand-ink">ดูแลนักเรียนไปด้วยกัน</p>
                <div className="flex items-center justify-between gap-2 text-xs font-medium sm:text-sm">
                  <span className="flex items-center gap-2"><CalendarCheck2 className="size-4 text-brand" aria-hidden="true" />เช็คชื่อ</span><span aria-hidden="true" className="text-blue-200">→</span>
                  <span className="flex items-center gap-2"><MessageCircle className="size-4 text-brand" aria-hidden="true" />แจ้งข่าว</span><span aria-hidden="true" className="text-blue-200">→</span>
                  <span className="flex items-center gap-2"><HeartHandshake className="size-4 text-brand" aria-hidden="true" />ดูแลต่อ</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <HomeGuide />
        <section id="features" aria-labelledby="features-title" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-8 max-w-2xl"><p className="text-xs font-semibold text-brand">เข้าใจโรงเรียน เข้าใจครอบครัว</p><h2 id="features-title" className="mt-2 text-2xl font-bold leading-relaxed text-ink-strong sm:text-3xl">เรื่องสำคัญของนักเรียน<br className="sm:hidden" /> อยู่ในที่เดียว</h2><p className="mt-3 text-sm leading-7 text-muted">ลดขั้นตอนที่กระจัดกระจาย ให้ครูมีเวลาดูแล และผู้ปกครองติดตามได้สะดวก</p></div>
          <div className="grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, description, tags }, i) => <article key={title} className="rounded-2xl border border-blue-100 bg-white p-6"><div className="mb-5 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-brand"><Icon className="size-6" aria-hidden="true" /></span><span aria-hidden="true" className="text-xs font-semibold text-blue-300">0{i + 1}</span></div><h3 className="text-lg font-bold text-ink-strong">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{description}</p><p className="mt-5 border-t border-blue-100 pt-4 text-xs leading-6 text-brand-ink">{tags}</p></article>)}</div>
        </section>
        <section id="families" aria-labelledby="families-title" className="scroll-mt-6 border-y border-blue-100 bg-[#f5f9ff]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[0.85fr_1.4fr] lg:gap-16">
            <div><p className="text-xs font-semibold text-brand">สำหรับผู้ปกครอง</p><h2 id="families-title" className="mt-2 text-2xl font-bold leading-relaxed text-ink-strong sm:text-3xl">เริ่มต้นดูแลลูก<br />ผ่าน LINE ของโรงเรียน</h2><p className="mt-4 text-sm leading-7 text-muted">ใช้บัญชี LINE ของคุณเพื่อรับข่าวสารและส่งคำขอลา โดยไม่ต้องพิมพ์แจ้งใหม่ทุกครั้ง</p><div className="mt-5 flex items-start gap-2 text-xs leading-6 text-brand-ink"><Check className="mt-1 size-4 shrink-0" aria-hidden="true" /><span>LINE เดียว เชื่อมบัญชีบุตรหลานได้มากกว่าหนึ่งคน</span></div></div>
            <ol>{steps.map((step, i) => <li key={step.title} className="flex gap-4 border-b border-blue-100 py-5 first:pt-0 last:border-0 last:pb-0"><span className="grid size-9 shrink-0 place-items-center rounded-full border border-blue-200 bg-white text-sm font-bold text-brand">{i + 1}</span><div><h3 className="font-semibold text-ink-strong">{step.title}</h3><p className="mt-1 text-sm leading-7 text-muted">{step.text}</p></div></li>)}</ol>
          </div>
        </section>
        <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 id="faq-title" className="mb-7 text-center text-2xl font-bold text-ink-strong">คำถามที่พบบ่อย</h2>
          <div className="divide-y divide-blue-100 border-y border-blue-100">{questions.map(question => <details key={question.title} className="group py-1"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">{question.title}<ChevronDown className="size-4 shrink-0 text-brand transition-transform group-open:rotate-180" aria-hidden="true" /></summary><p className="pb-5 pr-6 text-sm leading-7 text-muted">{question.answer}</p></details>)}</div>
        </section>
        <section aria-label="เข้าสู่ระบบสำหรับบุคลากร" className="mx-5 mb-12 rounded-3xl bg-[#173b67] px-6 py-9 text-white sm:mx-8 sm:px-10 lg:mx-auto lg:max-w-[1088px]"><div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><p className="text-xl font-semibold">พร้อมสำหรับวันเรียนดี ๆ อีกวัน</p><p className="mt-2 text-sm leading-7 text-blue-100">ครูและเจ้าหน้าที่ เข้าสู่พื้นที่ทำงานของโรงเรียนได้ที่นี่</p></div><Link href="/login" className="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-[#173b67] hover:bg-blue-50">เข้าสู่ระบบ <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section>
      </main>
      <footer className="border-t border-blue-100 px-5 py-7 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 text-xs leading-6 text-muted sm:flex-row"><p><strong className="font-semibold text-brand-ink">chumkosoft.</strong> โรงเรียนที่เชื่อมถึงกัน</p><p className="flex max-w-lg items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />ข้อมูลนักเรียนเปิดดูได้เฉพาะบัญชีที่ได้รับสิทธิ์จากโรงเรียน</p></div></footer>
    </div>
  );
}

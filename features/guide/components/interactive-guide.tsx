"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, HeartHandshake, Info, MessageCircle, ShieldCheck } from "lucide-react";
import Mascot from "@/components/ui/mascot";
import { guides, type GuideRole, type GuideStep } from "@/features/guide/content";

export default function InteractiveGuide({ initialRole }: { initialRole: GuideRole }): React.ReactNode {
  const [role, setRole] = useState<GuideRole>(initialRole);
  const [topicId, setTopicId] = useState(guides[initialRole][0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const topics = guides[role];
  const topic = topics.find(item => item.id === topicId) ?? topics[0];
  const step = topic.steps[stepIndex] ?? topic.steps[0];
  const last = stepIndex === topic.steps.length - 1;
  const nextTopic = topics[topics.indexOf(topic) + 1];

  function changeRole(next: GuideRole) {
    setRole(next); setTopicId(guides[next][0].id); setStepIndex(0);
  }
  function changeTopic(id: string) { setTopicId(id); setStepIndex(0); }

  return <div className="min-h-dvh bg-[#f4f8fe] text-ink">
    <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8"><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-ink"><ArrowLeft className="size-4" aria-hidden="true" />หน้าแรก</Link><span className="hidden text-sm font-bold text-brand-ink sm:block">chumkosoft<span className="text-sky-500">.</span> คู่มือใช้งาน</span><Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong">เข้าสู่ระบบ<ArrowRight className="size-4" aria-hidden="true" /></Link></div></header>
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-brand">ค่อย ๆ ทำไปด้วยกัน</p><h1 className="mt-2 text-2xl font-bold text-ink-strong sm:text-3xl">คู่มือครูและผู้ปกครอง</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-muted">เลือกบทเรียน แล้วกดแต่ละขั้นเพื่อดูภาพจำลองหน้าจอและคำอธิบาย โดยไม่ต้องล็อกอิน</p></div><Mascot pose="learning" size={104} decorative className="hidden shrink-0 sm:block" /></div>
      <div aria-label="เลือกคู่มือสำหรับ" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-1.5 sm:max-w-lg">{([{ value: "parent", label: "ผู้ปกครอง", icon: HeartHandshake }, { value: "teacher", label: "ครู", icon: GraduationCap }] as const).map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={role === value} onClick={() => changeRole(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ${role === value ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-blue-50"}`}><Icon className="size-5" aria-hidden="true" />สำหรับ{label}</button>)}</div>
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="lg:hidden"><label htmlFor="guide-topic" className="mb-2 block text-xs font-semibold text-muted">เลือกเรื่องที่ต้องการเรียนรู้</label><select id="guide-topic" value={topic.id} onChange={event => changeTopic(event.target.value)} className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold text-brand-ink">{topics.map((item, i) => <option key={item.id} value={item.id}>{i + 1}. {item.title}</option>)}</select></div>
        <aside className="hidden rounded-2xl border border-line bg-white p-3 lg:sticky lg:top-5 lg:block"><h2 className="px-2 pb-3 pt-1 text-xs font-semibold text-muted">เลือกเรื่องที่ต้องการเรียนรู้ · {topics.length} บท</h2><nav aria-label="บทเรียน" className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">{topics.map((item, i) => <button key={item.id} type="button" aria-current={topic.id === item.id ? "step" : undefined} onClick={() => changeTopic(item.id)} className={`flex min-h-12 items-start gap-2 rounded-xl px-3 py-3 text-left text-sm ${topic.id === item.id ? "bg-blue-50 font-semibold text-brand-ink" : "text-muted hover:bg-surface"}`}><span className="mt-0.5 shrink-0 text-xs opacity-70">{String(i + 1).padStart(2, "0")}</span><span>{item.title}</span></button>)}</nav></aside>
        <div className="min-w-0">
          <section aria-labelledby="topic-heading" className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-5 sm:px-6"><div className="flex items-center gap-2 text-xs font-semibold text-brand"><BookOpen className="size-4" aria-hidden="true" />คู่มือ{role === "parent" ? "ผู้ปกครอง" : "ครู"}</div><h2 id="topic-heading" className="mt-2 text-xl font-bold text-ink-strong sm:text-2xl">{topic.title}</h2><p className="mt-2 text-sm leading-7 text-muted">{topic.summary}</p><p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-6 text-brand-ink"><strong>ก่อนเริ่ม: </strong>{topic.prepare}</p></div>
            <div className="grid min-w-0 gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="min-w-0">
                <ol aria-label="ขั้นตอนของบทเรียน" className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2">{topic.steps.map((item, i) => <li key={item.title} className="shrink-0"><button type="button" aria-current={i === stepIndex ? "step" : undefined} onClick={() => setStepIndex(i)} aria-label={`ขั้นที่ ${i + 1}: ${item.title}`} className={`flex min-h-12 min-w-12 items-center xl:w-full gap-3 rounded-xl border px-3 py-3 text-left text-sm ${i === stepIndex ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-transparent text-muted hover:bg-surface"}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${i === stepIndex ? "bg-brand text-white" : "bg-surface-2 text-muted"}`}>{i + 1}</span><span className="hidden flex-1 xl:inline">{item.title}</span>{i === stepIndex && <ChevronRight className="hidden size-4 shrink-0 xl:block" aria-hidden="true" />}</button></li>)}</ol>
                <div aria-live="polite" aria-atomic="true" className="mt-5 rounded-xl bg-[#f4f8fe] p-4"><p className="text-xs font-semibold text-brand">ขั้นที่ {stepIndex + 1} จาก {topic.steps.length}</p><h3 className="mt-2 text-base font-bold text-ink-strong">{step.title}</h3><p className="mt-2 text-sm leading-7 text-ink">{step.instruction}</p></div>
              </div>
              <div className="min-w-0 rounded-2xl bg-[#eef4fc] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-2 text-[11px] font-medium text-muted"><span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-brand" />{step.channel === "line" ? "ตัวอย่างบนมือถือ · LINE" : "ตัวอย่างบนเว็บไซต์"}</span><span>ข้อมูลสมมติ</span></div><ScreenPreview step={step} /><p className="mt-3 text-center text-[11px] leading-5 text-muted">ภาพจำลองเพื่ออธิบายขั้นตอน หน้าตาอาจต่างตามอุปกรณ์<br />ปุ่มในภาพไม่ส่งข้อความหรือบันทึกข้อมูลจริง</p></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4 sm:px-6"><button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-line px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" />ย้อนกลับ</button><span className="text-xs text-muted" aria-hidden="true">{stepIndex + 1} / {topic.steps.length}</span>{!last ? <button type="button" onClick={() => setStepIndex(stepIndex + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">ดูขั้นถัดไป<ChevronRight className="size-4" aria-hidden="true" /></button> : nextTopic ? <button type="button" onClick={() => changeTopic(nextTopic.id)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">บทถัดไป<ChevronRight className="size-4" aria-hidden="true" /></button> : <button type="button" onClick={() => setStepIndex(0)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><Check className="size-4" aria-hidden="true" />ทบทวนบทนี้</button>}</div>
          </section>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-brand-ink"><Info className="size-4" aria-hidden="true" />ข้อควรรู้</h3><p className="mt-2 text-sm leading-7 text-muted">{topic.note}</p><details className="mt-4 border-t border-line pt-3"><summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-ink-strong">ถ้าทำไม่สำเร็จ ต้องตรวจอะไร?</summary><p className="mt-1 text-sm leading-7 text-muted">{topic.help}</p></details></div>
        </div>
      </div>
      <footer className="mt-8 flex items-start gap-2 border-t border-line pt-5 text-xs leading-6 text-muted"><ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" /><p>คู่มือนี้ไม่มีข้อมูลนักเรียนจริง ไม่ต้องกรอกรหัสผ่าน รหัส OTP หรือรหัสเชื่อม LINE ในหน้านี้ หากพบปัญหาบัญชีให้ติดต่อโรงเรียนผ่านช่องทางที่ได้รับโดยตรง</p></footer>
    </main>
  </div>;
}

function ScreenPreview({ step }: { step: GuideStep }): React.ReactNode {
  const line = step.channel === "line";
  return <div className={`mx-auto overflow-hidden border bg-white shadow-sm ${line ? "max-w-[320px] rounded-[28px] border-slate-300" : "rounded-xl border-line"}`} aria-label={`ภาพจำลอง ${step.screenTitle}`}>
    {line ? <><div className="flex items-center justify-between bg-white px-5 py-2 text-[10px] font-semibold text-slate-800"><span>9:41</span><span aria-hidden="true">● ▰</span></div><div className="flex items-center gap-2 border-b border-line px-3 py-3 text-sm font-bold text-[#173b67]"><ChevronLeft className="size-4" aria-hidden="true" /><span className="flex-1">LINE OA ของโรงเรียน</span><MessageCircle className="size-4" aria-hidden="true" /></div></> : <><div className="flex items-center gap-1 bg-slate-100 px-3 py-2"><span className="size-1.5 rounded-full bg-slate-300" /><span className="size-1.5 rounded-full bg-slate-300" /><span className="ml-2 truncate text-[10px] text-muted">chumkosoft.com · ภาพสาธิต</span></div><div className="border-b border-line px-4 py-3 text-xs font-bold text-brand-ink">chumkosoft. <span className="ml-2 font-normal text-muted">พื้นที่ทำงานครู</span></div></>}
    <div className={`min-h-[300px] p-3 sm:p-4 ${line ? "bg-[#dce9f5]" : "bg-[#f7f9fc]"}`}>
      {step.outgoing && <div className="mb-4 ml-8 rounded-xl rounded-tr-sm bg-[#d9f7be] px-3 py-2 text-xs leading-6 text-slate-800">{step.outgoing}</div>}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {line ? <div className="flex items-center gap-3 bg-[#eaf5ff] px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[9px] font-bold tracking-wide text-muted">CHUMKOSOFT SCHOOL</p><h4 className={`mt-1 text-sm font-bold leading-6 ${step.success ? "text-success" : "text-brand-ink"}`}>{step.screenTitle}</h4></div><Mascot pose={step.success ? "success" : "family"} size={60} decorative /></div> : <div className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold ${step.success ? "bg-success-soft text-success" : "bg-blue-50 text-brand-ink"}`}>{step.success ? <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> : <BookOpen className="size-4 shrink-0" aria-hidden="true" />}CHUMKOSOFT SCHOOL</div>}
        <div className="p-4">{!line && <h4 className="text-sm font-bold leading-6 text-ink-strong">{step.screenTitle}</h4>}<p className={`${line ? "" : "mt-3"} whitespace-pre-line text-xs leading-6 text-muted`}>{step.screenBody}</p>
          {step.roster && <div className="mt-3 overflow-hidden rounded-lg border border-line text-[11px]"><div className="grid grid-cols-2 bg-surface px-2 py-2 font-semibold"><span>นักเรียน</span><span>สถานะ</span></div>{[{ name: "ตัวอย่าง ก", status: "มา" }, { name: "ตัวอย่าง ข", status: "มาสาย" }, { name: "ตัวอย่าง ค", status: "ขาดเรียน" }].map(row => <div key={row.name} className="grid grid-cols-2 border-t border-line px-2 py-2"><span>{row.name}</span><span className="font-medium text-brand-ink">{row.status}</span></div>)}</div>}
        </div>
        {step.actions && <div className="space-y-1 border-t border-line p-2">{step.actions.map((label, i) => <span key={label} className={`flex min-h-9 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold ${i === 0 ? "bg-brand text-white" : "text-brand-ink"}`}>{label}</span>)}</div>}
      </div>
    </div>
    {line && <div aria-hidden="true" className="flex items-center gap-3 bg-white px-4 py-3 text-[11px] text-muted"><span>＋</span><span className="flex-1 rounded-full bg-slate-100 px-3 py-1.5">พิมพ์ข้อความ</span><span>☺</span></div>}
  </div>;
}

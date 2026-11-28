"use client";

import { useState } from "react";
import { GraduationCap, HeartHandshake } from "lucide-react";
import IllustratedGuide from "./illustrated-guide";
import type { GuideRole } from "@/features/guide/content";

export default function HomeGuide(): React.ReactNode {
  const [role, setRole] = useState<GuideRole>("parent");

  return <section id="manual" aria-labelledby="home-guide-title" className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-10 sm:px-8 sm:pt-14">
    <p className="text-xs font-semibold text-brand">คู่มือพร้อมภาพประกอบ</p>
    <h2 id="home-guide-title" className="mt-2 text-2xl font-bold leading-relaxed text-ink-strong sm:text-3xl">เริ่มใช้งาน ดูได้จากตรงนี้เลย</h2>
    <p className="mt-2 text-sm leading-7 text-muted">เลือกคู่มือของคุณ แล้วดูภาพผูก LINE แจ้งลา ขอมาสาย และพิจารณาคำขอได้ทันที</p>
    <div aria-label="เลือกกลุ่มคู่มือบนหน้าแรก" className="mb-5 mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-card p-1.5 sm:max-w-lg">{([{ value: "parent", label: "ผู้ปกครอง", icon: HeartHandshake }, { value: "teacher", label: "ครู", icon: GraduationCap }] as const).map(({ value, label, icon: Icon }) => <button type="button" key={value} aria-pressed={role === value} onClick={() => setRole(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ${role === value ? "bg-brand text-white" : "text-muted hover:bg-brand-soft"}`}><Icon className="size-5" aria-hidden="true" />สำหรับ{label}</button>)}</div>
    <IllustratedGuide key={role} role={role} />
  </section>;
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, Expand, ImageIcon } from "lucide-react";
import type { GuideRole } from "@/features/guide/content";

interface GuidePicture {
  id: string;
  title: string;
  src: string;
  alt: string;
  caption: string;
  topic: string;
}

const pictures: Record<GuideRole, GuidePicture[]> = {
  parent: [
    { id: "parent-connect", title: "1. ผูกบัญชี LINE", src: "/guides/parent-connect.png", alt: "ภาพคู่มือผู้ปกครอง: เพิ่มเพื่อน OA จากเอกสารโรงเรียน ส่งรหัสเชื่อมบัญชี 6 หลัก และตรวจชื่อนักเรียนหลังผูกสำเร็จ", caption: "มีลูกหลายคน ให้ส่งรหัสของแต่ละคนในแชท OA เดิม รหัสในภาพเป็นตัวอย่างเท่านั้น", topic: "parent-connect" },
    { id: "parent-leave", title: "2. แจ้งลาป่วย / ลากิจ", src: "/guides/parent-leave.png", alt: "ภาพคู่มือแจ้งลาผ่าน LINE ห้าขั้น: เลือกนักเรียน เลือกประเภทลา เลือกวันที่ เลือกเหตุผล และตรวจสอบก่อนยืนยัน", caption: "ภาพนี้สาธิตลาป่วยและลากิจ เมนูปัจจุบันมี “ขอมาสาย” เพิ่มด้วย และใช้ปุ่ม “ดูคำขอล่าสุด” เพื่อติดตามผล หากมีลูกหลายคนให้ส่งแยกทีละคน", topic: "parent-leave" },
    { id: "parent-late", title: "3. ขอมาสายล่วงหน้า", src: "/guides/parent-late.png", alt: "ภาพคู่มือขอมาสายล่วงหน้า: เลือกลูก ขอมาสาย เลือกวันและเวลาถึง เลือกเหตุผล ตรวจและส่งคำขอ จากนั้นรอครูอนุมัติ", caption: "ต้องได้รับอนุมัติจึงยกเว้นหัก 10 คะแนนเฉพาะวันที่ขอ โดยเวลาเข้าโรงเรียนจริงและสถานะมาสายยังบันทึกตามการสแกน เลือกเวลาที่ยังมาไม่ถึงเท่านั้น", topic: "parent-late" },
  ],
  teacher: [
    { id: "teacher-connect", title: "1. เชื่อม LINE ของครู", src: "/guides/teacher-connect.png", alt: "ภาพคู่มือครู: ขอรหัสจากแอดมิน เพิ่มเพื่อน OA ส่งรหัสในแชท แล้วตรวจสถานะและห้องที่ปรึกษาบนหน้า LINE ของฉัน", caption: "แอดมินเป็นผู้ออกรหัสให้ครู ตรวจห้องที่ปรึกษาและเวลาส่งสรุปในหน้า LINE ของฉัน หากไม่มีข้อมูลให้ติดต่อผู้ดูแล", topic: "teacher-connect" },
    { id: "teacher-review", title: "2. พิจารณาลา / มาสาย", src: "/guides/teacher-review.png", alt: "ภาพคู่มือครูที่ปรึกษา: รับคำขอผ่าน LINE เปิดรายละเอียดบนเว็บไซต์ ตรวจชื่อวันเวลาและเหตุผล ยืนยันผล และให้ผู้ปกครองติดตามผล", caption: "พิจารณาบนเว็บไซต์ด้วยบัญชีที่มีสิทธิ์ หากไม่อนุมัติต้องระบุเหตุผล การอนุมัติขอมาสายยกเว้นหัก 10 คะแนนเฉพาะวัน ไม่เปลี่ยนเวลาสแกนจริง", topic: "teacher-review" },
  ],
};

export default function IllustratedGuide({ role, onOpenTopic }: { role: GuideRole; onOpenTopic?: (topicId: string) => void }): React.ReactNode {
  const [selectedId, setSelectedId] = useState(pictures[role][0].id);
  const items = pictures[role];
  const selected = items.find(item => item.id === selectedId) ?? items[0];

  return <section aria-labelledby="illustrated-heading" className="mb-6 overflow-hidden rounded-2xl border border-line bg-card">
    <div className="px-4 pb-4 pt-5 sm:px-6"><div className="flex items-center gap-2 text-xs font-semibold text-brand"><ImageIcon className="size-4" aria-hidden="true" />คู่มือภาพสำหรับ{role === "parent" ? "ผู้ปกครอง" : "ครู"}</div><h2 id="illustrated-heading" className="mt-2 text-xl font-bold text-ink-strong">เห็นภาพครบ อ่านตามแล้วทำได้เลย</h2><p className="mt-2 text-sm leading-7 text-muted">เลือกภาพที่ต้องการดู บนมือถือเปิดภาพเต็มแล้วซูมเพื่ออ่านข้อความได้</p>
      <div aria-label="เลือกภาพคู่มือ" className={`mt-4 grid gap-2 ${role === "parent" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{items.map(item => <button type="button" key={item.id} aria-pressed={selected.id === item.id} onClick={() => setSelectedId(item.id)} className={`flex min-h-12 items-center gap-3 rounded-xl border p-2.5 text-left text-sm font-semibold ${selected.id === item.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-muted hover:bg-surface"}`}><span className="relative block h-10 w-16 shrink-0 overflow-hidden rounded-md bg-surface"><Image src={item.src} alt="" fill sizes="64px" className="object-contain" /></span>{item.title}</button>)}</div>
    </div>
    <figure className="border-y border-line"><a href={selected.src} target="_blank" rel="noreferrer" aria-label={`เปิดภาพเต็ม ${selected.title} ในแท็บใหม่`} className="block bg-surface"><Image key={selected.src} src={selected.src} alt={selected.alt} width={1672} height={941} sizes="(max-width: 1152px) 100vw, 1088px" className="h-auto w-full object-contain" /></a><figcaption aria-live="polite" className="px-4 py-4 text-sm leading-7 text-muted sm:px-6"><strong className="font-semibold text-brand-ink">{selected.title}</strong><br />{selected.caption}</figcaption></figure>
    <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-6"><a href={selected.src} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"><Expand className="size-4" aria-hidden="true" />เปิดภาพเต็ม<span className="sr-only">ในแท็บใหม่</span></a><a href={selected.src} download className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-brand-ink hover:bg-brand-soft"><Download className="size-4" aria-hidden="true" />ดาวน์โหลดภาพ</a>{onOpenTopic ? <button type="button" onClick={() => onOpenTopic(selected.topic)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-brand-ink hover:bg-brand-soft">อ่านขั้นตอนพร้อมข้อควรรู้<ArrowRight className="size-4" aria-hidden="true" /></button> : <Link href={`/guide?role=${role}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-brand-ink hover:bg-brand-soft">อ่านคู่มือฉบับเต็ม<ArrowRight className="size-4" aria-hidden="true" /></Link>}</div>
  </section>;
}

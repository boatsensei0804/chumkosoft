"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeviceSettingsDialog({ title, children, action }: { title: string; children: ReactNode; action: (data: FormData) => Promise<void> }): ReactNode {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="mt-5"><Button variant="outline" onClick={() => { setMessage(""); setOpen(true); }}>ตั้งค่า {title}</Button>{!open && message && <p role="status" className="mt-2 text-sm text-brand-ink">{message}</p>}<Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>ตั้งค่า {title}</DialogTitle><DialogDescription>ค่าจะส่งไปยังแอปเมื่อเครื่องสแกนเชื่อมต่ออินเทอร์เน็ต</DialogDescription></DialogHeader><form action={(data) => startTransition(async () => { try { await action(data); setMessage("บันทึกการตั้งค่าแล้ว"); setOpen(false); } catch { setMessage("บันทึกไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง"); } })} className="grid gap-4 sm:grid-cols-2"><fieldset disabled={pending} className="col-span-full grid gap-4 sm:grid-cols-2">{children}</fieldset>{message && <p role="alert" className="col-span-full text-sm text-danger">{message}</p>}<Button type="submit" disabled={pending} className="sm:col-span-2">{pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</Button></form></DialogContent></Dialog></div>;
}

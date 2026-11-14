"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function EditorDialog({ title, description, label = "แก้ไขข้อมูล", children }: { title: string; description: string; label?: string; children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" onClick={() => setOpen(true)}><Pencil className="size-4" />{label}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-5xl"><DialogHeader className="text-left"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog></>;
}

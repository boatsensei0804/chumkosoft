"use client";

import Link from "next/link";
import { ChevronDown, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function RecordActions({ name, href, onView, onEdit, onDelete }: { name: string; href?: string; onView?: () => void; onEdit: () => void; onDelete: () => void }): React.ReactNode {
  return <div className="flex items-center justify-end gap-2">{href ? <Button asChild variant="outline" size="sm" className="min-h-10"><Link href={href} aria-label={`ดูข้อมูล ${name}`}><Eye className="size-4" />ดูข้อมูล</Link></Button> : <Button variant="outline" size="sm" className="min-h-10" onClick={onView} aria-label={`ดูข้อมูล ${name}`}><Eye className="size-4" />ดูข้อมูล</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="min-h-10" aria-label={`จัดการ ${name}`}>จัดการ<ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onEdit}><Pencil className="size-4" />แก้ไขข้อมูล</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 className="size-4" />ลบรายการ</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>;
}

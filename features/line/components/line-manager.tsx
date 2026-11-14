"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Info, TriangleAlert, Printer, UsersRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import ClassroomFilter from "@/features/guardians/components/classroom-filter";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import { generateLinkCodeAction, generateStudentLinkCodeAction, prepareClassroomLinkCodesAction, prepareAllClassroomLinkCodesAction, unlinkGuardianAction, removeStudentLineAccountAction } from "@/features/line/actions";
import type { StudentGuardians } from "@/features/guardians/types";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";
import type { LineLinkStatus } from "@/features/line/types";
import type { Paginated } from "@/types/pagination";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Mascot from "@/components/ui/mascot";

const STATUS_META: Record<LineLinkStatus, { label: string; className: string }> = {
  linked: { label: "เชื่อม LINE แล้ว", className: "bg-success-soft text-[oklch(0.42_0.1_152)] border-success/30" },
  pending: { label: "รอผู้ปกครองผูก", className: "bg-warning-soft text-[oklch(0.5_0.12_55)] border-warning/30" },
  unlinked: { label: "ยังไม่เชื่อม LINE", className: "bg-surface-sunken text-faint border-line" },
};

const LINE_FILTERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "linked", label: "ผูกแล้ว" },
  { value: "pending", label: "มีรหัสรอผูก" },
  { value: "unprepared", label: "ยังไม่มีรหัส" },
] as const;

interface LineManagerProps {
  page: Paginated<StudentGuardians>;
  query: string;
  configured: boolean;
  classrooms: GuardianClassroomOption[];
  classroomId: string;
  filter: "all" | "linked" | "pending" | "unprepared";
}

export default function LineManager({ page, query, configured, classrooms, classroomId, filter }: LineManagerProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/line", { q: query, page: page.page, classroom: classroomId, filter });
  const [search, setSearch] = useState(query);
  const [unlinking, setUnlinking] = useState<{ kind: "guardian" | "student"; id: string; label: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportClassroomId, setExportClassroomId] = useState(classroomId || classrooms[0]?.id || "");
  const [oaUrl, setOaUrl] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [, startAction] = useTransition();

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  function generateCode(guardianId: string): void {
    setPendingId(guardianId);
    startAction(async () => {
      const result = await generateLinkCodeAction(guardianId);
      if (result.ok) toast.success(`รหัสผูกบัญชี: ${result.code}`);
      else toast.error(result.message ?? "ไม่สำเร็จ");
      setPendingId(null);
      if (result.ok) router.refresh();
    });
  }

  function generateStudentCode(studentId: string): void {
    setPendingId(studentId);
    startAction(async () => {
      const result = await generateStudentLinkCodeAction(studentId);
      if (result.ok && result.code) {
        try { await navigator.clipboard.writeText(result.code); } catch { /* code remains in toast */ }
        toast.success(`รหัส LINE: ${result.code} · คัดลอกแล้ว`);
      } else toast.error(result.message ?? "ไม่สำเร็จ");
      setPendingId(null);
      if (result.ok) router.refresh();
    });
  }

  function confirmUnlink(): void {
    if (!unlinking) return;
    setPendingId(unlinking.id);
    startAction(async () => {
      const result = unlinking.kind === "guardian" ? await unlinkGuardianAction(unlinking.id) : await removeStudentLineAccountAction(unlinking.id);
      if (result.ok) toast.success(result.message ?? "ยกเลิกการเชื่อมแล้ว");
      else toast.error(result.message ?? "ไม่สำเร็จ");
      setPendingId(null);
      setUnlinking(null);
      if (result.ok) router.refresh();
    });
  }

  function prepareAndPrint(): void {
    const parsed = safeLineOaUrl(oaUrl);
    if (!parsed) {
      toast.error("ใส่ลิงก์เพิ่มเพื่อน LINE OA ที่ขึ้นต้นด้วย https://line.me หรือ https://lin.ee");
      return;
    }
    if (!exportClassroomId) {
      toast.error("เลือกชั้นเรียนก่อนค่ะ");
      return;
    }
    setPreparing(true);
    startAction(async () => {
      const result = await prepareClassroomLinkCodesAction(exportClassroomId);
      setPreparing(false);
      if (!result.ok) {
        toast.error(result.message ?? "เตรียมรหัสไม่สำเร็จ");
        return;
      }
      toast.success(result.message ?? "เตรียมรหัสเรียบร้อย");
      const params = new URLSearchParams({ classroom: exportClassroomId, oa: parsed.toString() });
      router.push(`/dashboard/line/print?${params.toString()}`);
      setExportOpen(false);
      router.refresh();
    });
  }

  function prepareAndDownloadAll(): void {
    const parsed = safeLineOaUrl(oaUrl);
    if (!parsed) {
      toast.error("ใส่ลิงก์เพิ่มเพื่อน LINE OA ที่ขึ้นต้นด้วย https://line.me หรือ https://lin.ee");
      return;
    }
    setPreparing(true);
    startAction(async () => {
      const result = await prepareAllClassroomLinkCodesAction();
      setPreparing(false);
      if (!result.ok) {
        toast.error(result.message ?? "เตรียมรหัสทุกห้องไม่สำเร็จ");
        return;
      }
      toast.success(result.message ?? "เตรียมรหัสทุกห้องเรียบร้อย");
      const params = new URLSearchParams({ oa: parsed.toString() });
      window.location.assign(`/dashboard/line/export/pdf?${params.toString()}`);
      setExportOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <p className="flex items-start gap-2.5 rounded-[12px] border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-ink">
          <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-warning" />
          ยังไม่ได้ตั้งค่า LINE Official Account — สร้างรหัสผูกได้ แต่ระบบจะยังไม่ส่งข้อความจนกว่าจะตั้งค่า LINE_CHANNEL_ACCESS_TOKEN
        </p>
      )}

      <div className="flex items-start gap-2.5 rounded-[12px] border border-brand-soft bg-brand-softer px-4 py-3">
        <Info className="mt-0.5 size-[18px] shrink-0 text-brand-ink" />
        <p className="text-[13px] leading-relaxed text-ink">
          สร้างรหัสจากรายชื่อนักเรียนได้ แม้ยังไม่มีข้อมูลผู้ปกครอง → แจก QR และรหัส 6 หลักให้ผู้ปกครองส่งในแชท LINE OA เพื่อรับแจ้งเตือน · เพิ่ม/แก้ไขข้อมูลผู้ปกครองได้ที่เมนู{" "}
          <Link href="/dashboard/guardians" className="font-semibold text-brand-ink underline">
            ผู้ปกครอง
          </Link>
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-softer to-bg p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bg text-brand-ink shadow-sm"><UsersRound className="size-5" /></span>
          <div>
            <h2 className="text-[15px] font-bold text-ink-strong">เตรียม LINE ให้ผู้ปกครองเป็นชุด</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">เลือกห้องเรียน ระบบสร้างรหัสให้นักเรียนทั้งห้องที่ยังไม่มีรหัส แล้วจัดเอกสารแจกผู้ปกครองพร้อม QR เพิ่มเพื่อน LINE OA</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] font-medium text-brand-ink">
              <span className="rounded-full bg-bg px-2.5 py-1">1 · เลือกชั้น</span><ArrowRight className="size-3.5" />
              <span className="rounded-full bg-bg px-2.5 py-1">2 · เตรียมรหัส</span><ArrowRight className="size-3.5" />
              <span className="rounded-full bg-bg px-2.5 py-1">3 · พิมพ์ A4</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col">
          <Mascot pose="notify" size={88} decorative className="hidden sm:block" />
          <Button onClick={() => { setExportClassroomId(classroomId || classrooms[0]?.id || ""); setExportOpen(true); }} disabled={classrooms.length === 0} className="shrink-0">
            <Printer className="size-4" /> สร้างชุดเอกสาร A4
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ClassroomFilter classrooms={classrooms} value={classroomId} onChange={(id) => navigate({ classroom: id, page: 1 })} disabled={isPending} />
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:max-w-72">
          <Search className="size-[18px] text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือรหัสนักเรียน…"
            aria-label="ค้นหานักเรียน"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="กรองสถานะการผูก LINE">
        {LINE_FILTERS.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} disabled={isPending} onClick={() => navigate({ filter: item.value, page: 1 })} className={`min-h-10 rounded-full border px-3 py-2 text-sm font-semibold disabled:opacity-60 ${filter === item.value ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card text-muted hover:bg-surface-2"}`}>{item.label}</button>)}
        <span className="ml-auto text-xs text-muted">{page.total.toLocaleString("th-TH")} คน</span>
      </div>

      {page.rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-ink-strong">ไม่พบนักเรียน</p>
        </div>
      ) : (
        <div className={cn("rounded-2xl border border-line bg-card transition-opacity lg:overflow-x-auto", isPending && "opacity-60")}>
          <table className="w-full border-collapse text-left lg:min-w-[760px]">
            <thead className="hidden lg:table-header-group"><tr className="border-b border-line bg-surface text-[11.5px] font-semibold uppercase tracking-wide text-muted"><th className="px-4 py-3">นักเรียน / การเชื่อม LINE</th><th className="px-4 py-3">ผู้ปกครอง / รหัสเชื่อม</th><th className="w-36 px-4 py-3 text-right">จัดการ</th></tr></thead>
            <tbody className="block space-y-3 p-3 lg:table-row-group lg:space-y-0 lg:p-0">
              {page.rows.map((student) => {
                const linkedCount = student.guardians.filter((guardian) => guardian.lineStatus === "linked").length + student.lineAccounts.filter((account) => account.linked).length;
                const pendingCount = student.guardians.filter((guardian) => guardian.lineStatus === "pending").length + student.lineAccounts.filter((account) => !account.linked && account.linkCode).length;
                return (
                <tr key={student.studentId} className="block rounded-xl border border-line bg-bg align-top lg:table-row lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:last:border-b-0 lg:hover:bg-surface/60">
                  <td className="block w-full px-4 pb-2 pt-4 lg:table-cell lg:w-[27%] lg:py-4">
                    <p className="font-semibold text-ink-strong">{student.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{student.classroom} · รหัส {student.code}</p>
                    <p className={`mt-2 text-xs font-semibold ${linkedCount ? "text-success" : pendingCount ? "text-warning" : "text-muted"}`}>{linkedCount ? `เชื่อม LINE แล้ว ${linkedCount} รายการ` : pendingCount ? `มีรหัสรอผูก ${pendingCount} รายการ` : "ยังไม่มีรหัสเชื่อม"}</p>
                  </td>
                  <td className="block px-4 py-3 lg:table-cell">
                    <p className="mb-2 text-xs font-semibold text-muted lg:hidden">บัญชีและรหัสเชื่อม</p>
                    {student.guardians.length === 0 ? (
                      <p className="py-1 text-[13px] text-faint">ยังไม่มีข้อมูลผู้ปกครอง · ผูก LINE กับนักเรียนได้</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-line">
                        {student.guardians.map((g) => {
                          const meta = STATUS_META[g.lineStatus];
                          return (
                            <div key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 first:pt-1 last:pb-1">
                              <div className="min-w-0"><p className="text-[13px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")} <span className="font-normal text-muted">· {g.relation}</span></p>{g.lineDisplayName && <p className="mt-1 text-xs text-brand-ink">ชื่อ LINE: {g.lineDisplayName}</p>}{g.linkCode && <p className="mt-1 inline-flex rounded bg-brand-softer px-2 py-0.5 font-mono text-xs font-bold tracking-[0.18em] text-brand-ink">รหัส {g.linkCode}</p>}</div>
                              <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {student.lineAccounts.length > 0 && <div className="mt-2 space-y-2">{student.lineAccounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-softer px-3 py-2 text-xs"><div><p className="font-semibold text-brand-ink">{account.linked ? `LINE: ${account.lineDisplayName}` : account.linkCode ? `รหัสรอผูก ${account.linkCode}` : "ยังไม่มีรหัส"}</p><p className="mt-0.5 text-muted">ผูกกับนักเรียนโดยตรง · ยังไม่ระบุชื่อผู้ปกครอง</p></div><button type="button" onClick={() => setUnlinking({ kind: "student", id: account.id, label: `${student.name} · ${account.lineDisplayName ?? account.linkCode ?? "รายการ LINE"}` })} className="min-h-9 rounded-lg border border-line bg-card px-2.5 py-1.5 font-semibold text-danger hover:bg-danger-soft">{account.linked ? "ยกเลิกการผูก" : "ลบรหัส"}</button></div>)}</div>}
                  </td>
                  <td className="block border-t border-line px-4 py-3 text-left lg:table-cell lg:border-0 lg:text-right">
                    <div className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-end">
                      {student.guardians.map((g) => g.lineStatus === "linked" ? (
                        <Button key={g.id} variant="ghost" size="sm" className="min-h-9 text-[11px] text-danger" onClick={() => setUnlinking({ kind: "guardian", id: g.id, label: `${g.fullName} · ${g.lineDisplayName ?? "LINE"}` })}>ยกเลิก {g.fullName}</Button>
                      ) : (
                        <span key={g.id} className="inline-flex flex-wrap items-center gap-1"><Button variant="outline" size="sm" className="min-h-9 text-[11px]" disabled={pendingId === g.id} onClick={() => generateCode(g.id)}>{g.lineStatus === "pending" ? "สร้างรหัสใหม่" : "สร้างรหัส"}</Button>{g.lineStatus === "pending" && <Button variant="ghost" size="sm" className="min-h-9 text-[11px] text-danger" onClick={() => setUnlinking({ kind: "guardian", id: g.id, label: `${g.fullName} · รหัส ${g.linkCode}` })}>ลบรหัส</Button>}</span>
                      ))}
                      {student.guardians.length === 0 && <span className="text-xs text-faint">ใช้รหัสกับ LINE OA ของโรงเรียน</span>}
                      <Button variant="outline" size="sm" className="min-h-9 text-[11px]" disabled={pendingId === student.studentId} onClick={() => generateStudentCode(student.studentId)}>สร้างรหัสเพิ่ม</Button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <PaginationBar page={page.page} pageCount={page.pageCount} total={page.total} pageSize={page.pageSize} disabled={isPending} onPageChange={(p) => navigate({ page: p })} />
      </div>

      <ConfirmDialog
        open={unlinking !== null}
        title="ยกเลิกการผูก LINE หรือรหัส"
        message={unlinking ? `ยืนยันยกเลิก “${unlinking.label}” ใช่ไหม? หากเป็นบัญชีที่ผูกแล้ว บัญชีนี้จะไม่ได้รับแจ้งเตือนของนักเรียนรายการนี้อีก` : ""}
        confirmLabel="ยืนยันยกเลิก"
        destructive
        pending={pendingId === unlinking?.id}
        onConfirm={confirmUnlink}
        onClose={() => setUnlinking(null)}
      />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-line bg-bg p-5 sm:p-6">
            <DialogHeader className="flex-row items-center gap-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Printer className="size-5" /></span>
              <div><DialogTitle className="font-bold text-ink-strong">สร้างเอกสาร LINE สำหรับผู้ปกครอง</DialogTitle><DialogDescription className="mt-1 text-xs text-muted">เลือกห้องและใส่ลิงก์เพิ่มเพื่อน OA</DialogDescription></div>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-strong">ชั้นเรียน
                <NativeSelect value={exportClassroomId} onChange={(event) => setExportClassroomId(event.target.value)} className="bg-bg">
                  {classrooms.map((room) => <option key={room.id} value={room.id}>{room.code} · {room.gradeLevel}</option>)}
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-strong">ลิงก์เพิ่มเพื่อน LINE OA
                <input value={oaUrl} onChange={(event) => setOaUrl(event.target.value)} placeholder="https://lin.ee/… หรือ https://line.me/R/ti/p/@…" className="h-10 rounded-lg border border-line-strong bg-bg px-3 text-sm font-normal outline-none focus:border-brand" inputMode="url" />
              </label>
              <div className="rounded-xl border border-brand/20 bg-brand-softer p-3.5 text-[12.5px] leading-relaxed text-ink">
                <p className="font-bold text-brand-ink">ผู้ปกครองทำตาม 3 ขั้นตอน</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5"><li>สแกน QR เพื่อเพิ่มเพื่อน LINE OA ของโรงเรียน</li><li>พิมพ์รหัส 6 หลักบนเอกสารในแชท</li><li>รอข้อความยืนยันการเชื่อมบัญชี</li></ol>
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted">ระบบจะสร้างเฉพาะรหัสที่ยังไม่มี และเก็บรหัสเดิมไว้ · PDF ทุกห้องเป็นไฟล์เดียว โดยเริ่มหน้าใหม่เมื่อเปลี่ยนห้อง</p>
              <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setExportOpen(false)}>ยกเลิก</Button><Button type="button" variant="outline" onClick={prepareAndPrint} disabled={preparing || !exportClassroomId}>{preparing ? "กำลังเตรียม…" : "เปิดเอกสารห้องที่เลือก"}</Button><Button type="button" onClick={prepareAndDownloadAll} disabled={preparing || classrooms.length === 0}>{preparing ? "กำลังเตรียม…" : "ดาวน์โหลด PDF ทุกห้อง"}</Button></div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function safeLineOaUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !["line.me", "www.line.me", "lin.ee"].includes(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

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
import { generateLinkCodeAction, prepareClassroomLinkCodesAction, unlinkGuardianAction } from "@/features/line/actions";
import type { GuardianRow, StudentGuardians } from "@/features/guardians/types";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";
import type { LineLinkStatus } from "@/features/line/types";
import type { Paginated } from "@/types/pagination";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_META: Record<LineLinkStatus, { label: string; className: string }> = {
  linked: { label: "เชื่อม LINE แล้ว", className: "bg-success-soft text-[oklch(0.42_0.1_152)] border-success/30" },
  pending: { label: "รอผู้ปกครองผูก", className: "bg-warning-soft text-[oklch(0.5_0.12_55)] border-warning/30" },
  unlinked: { label: "ยังไม่เชื่อม LINE", className: "bg-surface-sunken text-faint border-line" },
};

interface LineManagerProps {
  page: Paginated<StudentGuardians>;
  query: string;
  configured: boolean;
  classrooms: GuardianClassroomOption[];
  classroomId: string;
}

export default function LineManager({ page, query, configured, classrooms, classroomId }: LineManagerProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/line", { q: query, page: page.page, classroom: classroomId });
  const [search, setSearch] = useState(query);
  const [unlinking, setUnlinking] = useState<GuardianRow | null>(null);
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

  function confirmUnlink(): void {
    if (!unlinking) return;
    startAction(async () => {
      const result = await unlinkGuardianAction(unlinking.id);
      if (result.ok) toast.success(result.message ?? "ยกเลิกการเชื่อมแล้ว");
      else toast.error(result.message ?? "ไม่สำเร็จ");
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
          กด “สร้างรหัส” ให้ผู้ปกครอง → ผู้ปกครองเพิ่ม LINE OA ของโรงเรียนเป็นเพื่อนและพิมพ์รหัส 6 หลักในแชท เพื่อรับแจ้งเตือนเมื่อนักเรียนเข้าโรงเรียน · เพิ่ม/แก้ไขข้อมูลผู้ปกครองได้ที่เมนู{" "}
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
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">เลือกระดับชั้น ระบบสร้างรหัสที่ยังไม่มีให้ครั้งเดียว แล้วจัดเอกสารแจกผู้ปกครองพร้อม QR เพิ่มเพื่อน LINE OA ได้เลย ไม่ต้องกดสร้างรหัสทีละคน</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] font-medium text-brand-ink">
              <span className="rounded-full bg-bg px-2.5 py-1">1 · เลือกชั้น</span><ArrowRight className="size-3.5" />
              <span className="rounded-full bg-bg px-2.5 py-1">2 · เตรียมรหัส</span><ArrowRight className="size-3.5" />
              <span className="rounded-full bg-bg px-2.5 py-1">3 · พิมพ์ A4</span>
            </div>
          </div>
        </div>
        <Button onClick={() => { setExportClassroomId(classroomId || classrooms[0]?.id || ""); setExportOpen(true); }} disabled={classrooms.length === 0} className="shrink-0">
          <Printer className="size-4" /> สร้างชุดเอกสาร A4
        </Button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <ClassroomFilter classrooms={classrooms} value={classroomId} onChange={(id) => navigate({ classroom: id, page: 1 })} disabled={isPending} />
        <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:max-w-72">
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

      {page.rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-ink-strong">ไม่พบนักเรียน</p>
        </div>
      ) : (
        <div className={cn("overflow-x-auto rounded-2xl border border-line bg-card transition-opacity", isPending && "opacity-60")}>
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr className="border-b border-line bg-surface text-[11.5px] font-semibold uppercase tracking-wide text-muted"><th className="px-4 py-3">นักเรียน</th><th className="px-4 py-3">ผู้ปกครอง / สถานะ LINE</th><th className="w-36 px-4 py-3 text-right">จัดการ</th></tr></thead>
            <tbody>
              {page.rows.map((student) => (
                <tr key={student.studentId} className="border-b border-line align-top last:border-0 hover:bg-surface/60">
                  <td className="w-[27%] px-4 py-4">
                    <p className="font-semibold text-ink-strong">{student.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{student.classroom} · รหัส {student.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    {student.guardians.length === 0 ? (
                      <p className="py-1 text-[13px] text-faint">ยังไม่มีผู้ปกครอง — <Link href="/dashboard/guardians" className="font-semibold text-brand-ink underline">เพิ่มข้อมูลผู้ปกครอง</Link></p>
                    ) : (
                      <div className="flex flex-col divide-y divide-line">
                        {student.guardians.map((g) => {
                          const meta = STATUS_META[g.lineStatus];
                          return (
                            <div key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 first:pt-1 last:pb-1">
                              <div className="min-w-0"><p className="text-[13px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")} <span className="font-normal text-muted">· {g.relation}</span></p>{g.linkCode && <p className="mt-1 inline-flex rounded bg-brand-softer px-2 py-0.5 font-mono text-xs font-bold tracking-[0.18em] text-brand-ink">รหัส {g.linkCode}</p>}</div>
                              <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {student.guardians.map((g) => g.lineStatus === "linked" ? (
                        <Button key={g.id} variant="ghost" size="sm" className="h-7 text-[11px] text-muted" onClick={() => setUnlinking(g)}>ยกเลิก {g.fullName}</Button>
                      ) : (
                        <Button key={g.id} variant="outline" size="sm" className="h-7 text-[11px]" disabled={pendingId === g.id} onClick={() => generateCode(g.id)}>{g.lineStatus === "pending" ? "สร้างรหัสใหม่" : "สร้างรหัส"}</Button>
                      ))}
                      {student.guardians.length === 0 && <span className="text-xs text-faint">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <PaginationBar page={page.page} pageCount={page.pageCount} total={page.total} pageSize={page.pageSize} disabled={isPending} onPageChange={(p) => navigate({ page: p })} />
      </div>

      <ConfirmDialog
        open={unlinking !== null}
        title="ยกเลิกการเชื่อม LINE"
        message={unlinking ? `ต้องการยกเลิกการเชื่อม LINE ของ “${unlinking.fullName}” ใช่หรือไม่? ผู้ปกครองจะไม่ได้รับแจ้งเตือนอีก` : ""}
        confirmLabel="ยกเลิกการเชื่อม"
        destructive
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
              <p className="text-[11.5px] leading-relaxed text-muted">ระบบจะสร้างเฉพาะรหัสที่ยังไม่มี และเก็บรหัสที่เตรียมไว้แล้วไว้เหมือนเดิม · พิมพ์ได้ทั้งชุดของชั้นเรียน</p>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setExportOpen(false)}>ยกเลิก</Button><Button type="button" onClick={prepareAndPrint} disabled={preparing || !exportClassroomId}>{preparing ? "กำลังเตรียม…" : "เตรียมรหัสและเปิดเอกสาร"}</Button></div>
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

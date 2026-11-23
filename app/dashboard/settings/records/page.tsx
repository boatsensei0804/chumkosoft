import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import { isTrashKind, trashKinds } from "@/features/settings/admin-records";
import { AdminAccountDialog, RecordActionButton } from "@/features/settings/components/admin-record-controls";
import { listAdminAccounts, listArchivedRecords, trashPageSize } from "@/features/settings/services/admin-records-service";
import { requireRoles } from "@/lib/dal";
import { parsePage } from "@/types/pagination";

export const metadata: Metadata = { title: "บัญชีแอดมินและถังขยะ · Chumkosoft" };

const path = "/dashboard/settings/records";
const formatDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function AdminRecordsPage({ searchParams }: {
  searchParams: Promise<{ view?: string; kind?: string; page?: string }>;
}): Promise<React.ReactNode> {
  const actor = await requireRoles(["ADMIN"]);
  const params = await searchParams;
  const trash = params.view === "trash";
  const kind = isTrashKind(params.kind) ? params.kind : "course";
  const page = Math.min(100000, parsePage(params.page));
  const [accounts, archived] = trash ? [[], await listArchivedRecords(kind, page)] : [await listAdminAccounts(), []];
  const trashUrl = `${path}?view=trash&kind=${kind}`;

  return <>
    <PageHeader title="บัญชีแอดมินและถังขยะ" subtitle="จัดการบัญชีผู้ดูแล และตรวจรายการที่ถูกลบไว้"
      actions={<Button asChild variant="outline"><Link href="/dashboard/settings">กลับการตั้งค่า</Link></Button>} />
    <nav aria-label="บัญชีและถังขยะ" className="mb-4 flex flex-wrap gap-2">
      <Button asChild variant={trash ? "outline" : "default"}><Link href={path} aria-current={trash ? undefined : "page"}>บัญชีแอดมิน</Link></Button>
      <Button asChild variant={trash ? "default" : "outline"}><Link href={trashUrl} aria-current={trash ? "page" : undefined}>ถังขยะ</Link></Button>
    </nav>
    {trash ? (
      <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
        <h2 className="text-base font-bold text-ink-strong">รายการในถังขยะ</h2>
        <p className="mt-1 text-sm text-muted">ลบถาวรได้เฉพาะรายการที่ถูกลบไว้และไม่มีข้อมูลอ้างอิง</p>
        <nav aria-label="ประเภทข้อมูลที่ถูกลบ" className="my-4 flex flex-wrap gap-2">
          {Object.entries(trashKinds).map(([key, label]) => (
            <Button asChild key={key} variant={key === kind ? "secondary" : "outline"}>
              <Link href={`${path}?view=trash&kind=${key}`} aria-current={key === kind ? "page" : undefined}>{label}</Link>
            </Button>
          ))}
        </nav>
        <ul className="divide-y divide-line">
          {archived.slice(0, trashPageSize).map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="break-all font-medium text-ink">{item.label}</p>
                {item.deletedAt && <time dateTime={item.deletedAt.toISOString()} className="text-xs text-muted">ลบเมื่อ {formatDate.format(item.deletedAt)}</time>}
              </div>
              <div className="flex flex-wrap gap-2">
                {kind === "admin" && <RecordActionButton operation={{ change: "restore" }} id={item.id} item={item.label} />}
                <RecordActionButton operation={{ purge: kind }} id={item.id} item={item.label} />
              </div>
            </li>
          ))}
        </ul>
        {!archived.length && <p className="rounded-xl bg-surface p-4 text-sm text-muted">ไม่มีรายการในหน้านี้</p>}
        {(page > 1 || archived.length > trashPageSize) && (
          <nav aria-label="หน้ารายการถังขยะ" className="mt-4 flex items-center gap-2">
            {page > 1 && <Button asChild variant="outline"><Link href={`${trashUrl}&page=${page - 1}`}>ก่อนหน้า</Link></Button>}
            <span className="text-sm text-muted">หน้า {page}</span>
            {archived.length > trashPageSize && <Button asChild variant="outline"><Link href={`${trashUrl}&page=${page + 1}`}>ถัดไป</Link></Button>}
          </nav>
        )}
      </section>
    ) : (
      <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-ink-strong">บัญชีผู้ดูแลระบบ</h2><p className="mt-1 text-sm text-muted">เปิดใช้งาน {accounts.filter((account) => account.isActive).length} จาก {accounts.length} บัญชี</p></div>
          <AdminAccountDialog />
        </header>
        <ul className="mt-3 divide-y divide-line">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-all font-medium text-ink">{account.email}</p>
                <p className="text-xs text-muted">{account.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}{account.id === actor.id ? " · บัญชีของคุณ" : ""}</p>
              </div>
              {account.id !== actor.id && <div className="flex flex-wrap gap-2">
                <AdminAccountDialog account={account} />
                <RecordActionButton operation={{ change: account.isActive ? "disable" : "enable" }} id={account.id} item={account.email} />
                <RecordActionButton operation={{ change: "archive" }} id={account.id} item={account.email} />
              </div>}
            </li>
          ))}
        </ul>
      </section>
    )}
  </>;
}

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleAction } from "@/types/form";
import { manageScannerPinMappings } from "./actions";

type PinMappingRow = {
  pin: string;
  studentCode: string;
  studentName: string;
  archived: boolean;
  legacy: boolean;
};

const csvExample = "data:text/csv;charset=utf-8,pin%2CstudentCode%0D%0A00421%2C69-0421%0D%0A";

export default function PinMappingForms({ deviceId, rows }: { deviceId: string; rows: PinMappingRow[] }) {
  const [state, action, pending] = useActionState(manageScannerPinMappings, idleAction);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visibleRows = rows.filter(({ pin, studentCode, studentName }) => `${pin} ${studentCode} ${studentName}`.toLowerCase().includes(query));

  return <div className="space-y-5">
    {state.message && <p role={state.ok ? "status" : "alert"}
      className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
      {state.message}
    </p>}
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 text-base font-bold text-ink-strong">จับคู่ทีละคน</h2>
        <form action={action} className="space-y-4">
          <input type="hidden" name="deviceId" value={deviceId} />
          <input type="hidden" name="operation" value="save" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="scanner-pin">รหัสบนเครื่อง</Label>
              <Input id="scanner-pin" name="pin" inputMode="numeric" pattern="[0-9]{1,9}" maxLength={9} placeholder="00421" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scanner-student-code">รหัสนักเรียน</Label>
              <Input id="scanner-student-code" name="studentCode" maxLength={80} placeholder="69-0421" required />
            </div>
          </div>
          <label className="flex min-h-8 items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="replace" className="size-4 accent-brand" />
            อนุญาตให้เปลี่ยนนักเรียนที่ผูกอยู่กับรหัสนี้
          </label>
          <Button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกคู่รหัส"}</Button>
        </form>
      </section>
      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-2 text-base font-bold text-ink-strong">นำเข้าหลายคนจาก CSV</h2>
        <p id="pin-csv-help" className="mb-4 text-sm text-muted">สูงสุด 500 รายการต่อไฟล์ เก็บรหัสบนเครื่องเป็นข้อความเพื่อรักษาเลขศูนย์นำหน้า</p>
        <form action={action} className="space-y-4">
          <input type="hidden" name="deviceId" value={deviceId} />
          <input type="hidden" name="operation" value="import" />
          <div className="space-y-1">
            <Label htmlFor="scanner-pin-file">ไฟล์ CSV</Label>
            <Input id="scanner-pin-file" type="file" name="file" accept=".csv,text/csv" aria-describedby="pin-csv-help" required />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>{pending ? "กำลังตรวจไฟล์…" : "นำเข้า CSV"}</Button>
            <a href={csvExample} download="scanner-pin-template.csv" className="text-sm font-semibold text-brand-ink underline">ดาวน์โหลดตัวอย่าง CSV</a>
          </div>
        </form>
      </section>
    </div>
    <section className="rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-5">
        <h2 className="text-base font-bold text-ink-strong">คู่รหัสทั้งหมด <span className="ml-2 text-sm font-medium text-muted">{rows.length} รายการ</span></h2>
        <div className="w-full space-y-1 sm:w-64">
          <Label htmlFor="scanner-pin-search">ค้นหาคู่รหัส</Label>
          <Input id="scanner-pin-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </header>
      {visibleRows.length ? <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-ink-strong"><tr>
            <th className="px-5 py-3" scope="col">รหัสบนเครื่อง</th>
            <th className="px-5 py-3" scope="col">นักเรียน</th>
            <th className="px-5 py-3" scope="col">จัดการ</th>
          </tr></thead>
          <tbody className="divide-y divide-line">{visibleRows.map((row) => <tr key={row.pin}>
            <th className="px-5 py-3 font-medium tabular-nums" scope="row">{row.pin}</th>
            <td className="px-5 py-3">
              {row.studentName && <span className="block font-semibold">{row.studentName}</span>}
              <span className="text-muted">{row.archived ? "นักเรียนอยู่ในถังขยะ" : row.studentCode}{row.legacy && " · คู่รหัสเดิม"}</span>
            </td>
            <td className="px-5 py-3">
              <form action={action} className="flex flex-wrap gap-2">
                <input type="hidden" name="deviceId" value={deviceId} />
                <input type="hidden" name="pin" value={row.pin} />
                {row.legacy && <Button type="submit" name="operation" value="legacy" variant="outline" size="sm" disabled={pending}>ย้ายเข้าระบบ</Button>}
                <Button type="submit" name="operation" value="unlink" variant="outline" size="sm" disabled={pending}
                  aria-label={`ยกเลิกการจับคู่รหัส ${row.pin}`}>ยกเลิกการจับคู่</Button>
              </form>
            </td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="p-5 text-sm text-muted">{rows.length ? "ไม่พบคู่รหัสที่ตรงกับคำค้น" : "ยังไม่มีคู่รหัสนักเรียนสำหรับเครื่องนี้"}</p>}
    </section>
  </div>;
}

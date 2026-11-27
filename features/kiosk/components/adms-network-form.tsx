"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAdmsNetworkAction } from "@/features/kiosk/actions";

export default function AdmsNetworkForm({ allowedIps, revision }: { allowedIps: string[]; revision: number }) {
  const [addresses, setAddresses] = useState(allowedIps.join("\n"));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await saveAdmsNetworkAction(formData);
      if (result.ok) {
        toast.success(result.message);
      } else {
        setError(result.message ?? "บันทึกเครือข่ายไม่สำเร็จ");
      }
    });
  }

  return (
    <section id="zkteco-networks" tabIndex={-1} className="scroll-mt-24 rounded-xl border border-line bg-card p-5">
      <h2 className="font-bold text-ink-strong">เครือข่ายที่อนุญาตสำหรับ ZKTeco</h2>
      <p className="mt-1 text-sm text-muted">เพิ่ม Public IP ของเครือข่ายที่เครื่องสแกนใช้เชื่อมต่อผ่านโดเมน แล้วบันทึกเพื่อให้มีผลทันที</p>
      {revision === 0 && allowedIps.length > 0 && (
        <p className="mt-2 text-sm text-muted">แสดงรายการเดิมจากเซิร์ฟเวอร์ เมื่อบันทึกแล้วจะใช้รายการจากหน้านี้</p>
      )}
      <form action={save} className="mt-4 max-w-md space-y-3">
        <input type="hidden" name="revision" value={revision} />
        <div className="space-y-1.5">
          <Label htmlFor="adms-allowed-ips">Public IP ที่อนุญาต</Label>
          <Textarea id="adms-allowed-ips" name="allowedIps" rows={4} value={addresses}
            onChange={(event) => setAddresses(event.target.value)}
            disabled={pending} autoCorrect="off" autoCapitalize="none" spellCheck={false}
            aria-describedby="adms-ips-help" />
          <p id="adms-ips-help" className="text-xs text-muted">กรอกหนึ่ง IP ต่อบรรทัด หากบันทึกรายการว่าง เครื่องที่เชื่อมต่อผ่านโดเมนจะติดต่อไม่ได้</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกเครือข่าย"}</Button>
      </form>
    </section>
  );
}

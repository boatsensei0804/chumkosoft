import { getLineDeliveryState } from "@/features/line/services/line-delivery-settings";
import LineDeliveryControl from "@/features/line/components/line-delivery-control";
import { getAnnouncementAudienceOptions } from "@/features/line/services/announcement-audience-service";
import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import LineAnnouncementComposer from "@/features/line/components/line-announcement-composer";
import { getLinkedLineRecipientCount, listLineAnnouncements } from "@/features/line/services/line-announcements";
import { isLineConfigured } from "@/lib/line";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = { title: "ส่งประกาศ LINE · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function LineAnnouncementsPage(): Promise<React.ReactNode> {
  await requireRoles(["ADMIN"]);
  const [recipientCount, rows, audienceOptions, delivery] = await Promise.all([getLinkedLineRecipientCount(), listLineAnnouncements(), getAnnouncementAudienceOptions(), getLineDeliveryState()]);
  const history = rows.map((row) => {
    const accepted = row.batches.filter((batch) => batch.status === "ACCEPTED")
      .reduce((sum, batch) => sum + batch.recipientCount, 0);
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      imageId: row.imageId,
      recipientCount: row.recipientCount,
      accepted,
      failed: row.batches.some((batch) => batch.status === "FAILED"),
      errorCode: row.batches.find((batch) => batch.status === "FAILED")?.errorCode ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  });
  return <>
    <PageHeader title="ส่งประกาศผ่าน LINE" subtitle="แจ้งข่าวสารหรือเหตุฉุกเฉินถึงบัญชี LINE ที่ผูกกับนักเรียนและครูในระบบ" />
    <LineDeliveryControl key={`${delivery.enabled}-${delivery.updatedAt}-${delivery.available}`} initial={delivery} canManage={true} />
    <LineAnnouncementComposer sendingEnabled={delivery.enabled && delivery.available} audienceOptions={audienceOptions} recipientCount={recipientCount} configured={isLineConfigured()} history={history} />
  </>;
}

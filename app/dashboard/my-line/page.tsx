import type { Metadata } from "next";
import QRCode from "qrcode";
import PageHeader from "@/features/dashboard/components/page-header";
import AdvisorLineConnect from "@/features/line/components/advisor-line-connect";
import { getAdvisorLine } from "@/features/line/repositories/line-repository";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = { title: "LINE ของฉัน · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function MyLinePage(): Promise<React.ReactNode> {
  const user = await requireRoles(["TEACHER"]);
  if (!user.staffId) return <>
    <PageHeader title="LINE ของฉัน" subtitle="เชื่อมบัญชี LINE เพื่อรับสรุปการเข้าโรงเรียนของห้องที่ปรึกษา" />
    <div className="rounded-2xl border border-line bg-card p-6 text-sm text-ink">บัญชีครูนี้ยังไม่เชื่อมกับข้อมูลครูและบุคลากร กรุณาให้ผู้ดูแลระบบตรวจบัญชีของคุณ</div>
  </>;

  const [line, setting, advisoryRooms] = await Promise.all([
    getAdvisorLine(user.staffId),
    prisma.advisorDigestSetting.findUnique({ where: { id: 1 }, select: { sendTime: true, oaAddFriendUrl: true } }),
    prisma.classroomAdvisor.findMany({
      where: { staffId: user.staffId, classroom: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } } },
      select: { classroom: { select: { code: true } } },
    }),
  ]);
  const friendUrl = setting?.oaAddFriendUrl ?? null;
  const friendQr = friendUrl ? await QRCode.toDataURL(friendUrl, { margin: 1, width: 184 }) : null;

  return <>
    <PageHeader title="LINE ของฉัน" subtitle="เชื่อม LINE OA ของโรงเรียนด้วยรหัส 6 หลัก และตรวจสถานะการเชื่อมต่อได้ที่นี่" />
    <AdvisorLineConnect
      linked={Boolean(line?.lineUserId)}
      currentCode={line?.lineLinkCode ?? null}
      friendUrl={friendUrl}
      friendQr={friendQr}
      advisoryRooms={advisoryRooms.map((room) => room.classroom.code)}
      sendTime={setting?.sendTime ?? "09:00"}
    />
  </>;
}

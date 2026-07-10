import type { Metadata } from "next";
import { MapPin, BookOpen, DoorOpen } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import StatStrip from "@/components/ui/stat-strip";
import RoomsBrowser from "@/features/rooms/components/rooms-browser";
import { listRooms } from "@/features/rooms/services/room-service";

export const metadata: Metadata = {
  title: "ห้องและสถานที่ · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function RoomsPage(): Promise<React.ReactNode> {
  const rooms = await listRooms();
  const inUse = rooms.filter((r) => r.offeringCount > 0).length;

  return (
    <>
      <PageHeader title="ห้องและสถานที่" subtitle={`ห้องเรียน ห้องปฏิบัติการ และสถานที่ ${rooms.length.toLocaleString("th-TH")} แห่ง`} />
      <StatStrip
        items={[
          { label: "ห้องทั้งหมด", value: rooms.length, hint: "แห่ง", icon: MapPin, tone: "brand" },
          { label: "ใช้สอนอยู่", value: inUse, hint: "แห่ง", icon: BookOpen, tone: "success" },
          { label: "ว่าง", value: rooms.length - inUse, hint: "แห่ง", icon: DoorOpen, tone: "default" },
        ]}
      />
      <RoomsBrowser rooms={rooms} />
    </>
  );
}

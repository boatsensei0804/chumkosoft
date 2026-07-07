import type { Metadata } from "next";
import PageHeader from "@/features/dashboard/components/page-header";
import RoomsBrowser from "@/features/rooms/components/rooms-browser";
import { listRooms } from "@/features/rooms/services/room-service";

export const metadata: Metadata = {
  title: "ห้องและสถานที่ · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function RoomsPage(): Promise<React.ReactNode> {
  const rooms = await listRooms();
  return (
    <>
      <PageHeader title="ห้องและสถานที่" subtitle={`ห้องเรียน ห้องปฏิบัติการ และสถานที่ ${rooms.length.toLocaleString("th-TH")} แห่ง`} />
      <RoomsBrowser rooms={rooms} />
    </>
  );
}

import "server-only";

import * as repo from "@/features/rooms/repositories/room-repository";
import type { RoomInput } from "@/features/rooms/schemas/room-schema";
import type { RoomRow } from "@/features/rooms/types";
import type { ActionResult } from "@/types/form";

export async function listRooms(): Promise<RoomRow[]> {
  const rows = await repo.findRooms();
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    building: r.building,
    capacity: r.capacity,
    offeringCount: r._count.offerings,
  }));
}

export async function createRoomRecord(input: RoomInput): Promise<ActionResult> {
  if (await repo.roomCodeExists(input.code)) {
    return { ok: false, fieldErrors: { code: "รหัสห้องนี้ถูกใช้แล้ว" } };
  }
  await repo.createRoom(input);
  return { ok: true, message: "เพิ่มห้องเรียบร้อย" };
}

export async function updateRoomRecord(id: string, input: RoomInput): Promise<ActionResult> {
  if (await repo.roomCodeExists(input.code, id)) {
    return { ok: false, fieldErrors: { code: "รหัสห้องนี้ถูกใช้แล้ว" } };
  }
  await repo.updateRoom(id, input);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteRoomRecord(id: string): Promise<ActionResult> {
  if (await repo.roomInUse(id)) {
    return { ok: false, message: "ลบไม่ได้ เพราะห้องนี้ยังถูกใช้ในรายวิชาหรือตารางสอน" };
  }
  await repo.softDeleteRoom(id);
  return { ok: true, message: "ลบห้องเรียบร้อย" };
}

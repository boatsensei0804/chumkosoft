import "server-only";

import prisma from "@/lib/prisma";
import type { RoomInput } from "@/features/rooms/schemas/room-schema";

/** Rooms with how many subjects currently use them in the active term. */
export async function findRooms() {
  return prisma.room.findMany({
    where: { isDeleted: false },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      building: true,
      capacity: true,
      _count: {
        select: {
          offerings: { where: { isDeleted: false, term: { isActive: true, isDeleted: false } } },
        },
      },
    },
  });
}

export async function roomCodeExists(code: string, excludeId?: string): Promise<boolean> {
  const row = await prisma.room.findFirst({
    where: { code, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

export async function createRoom(data: RoomInput): Promise<{ id: string }> {
  return prisma.room.create({ data, select: { id: true } });
}

export async function updateRoom(id: string, data: RoomInput): Promise<void> {
  await prisma.room.update({ where: { id }, data });
}

/** A room used by an active offering or scheduled slot cannot be deleted. */
export async function roomInUse(id: string): Promise<boolean> {
  const offering = await prisma.courseOffering.findFirst({ where: { roomId: id, isDeleted: false }, select: { id: true } });
  if (offering) return true;
  const slot = await prisma.timetableSlot.findFirst({ where: { roomId: id, isDeleted: false }, select: { id: true } });
  return slot !== null;
}

/** Soft delete; frees the unique code so it can be reused. */
export async function softDeleteRoom(id: string): Promise<void> {
  const row = await prisma.room.findUnique({ where: { id }, select: { code: true, isDeleted: true } });
  if (!row || row.isDeleted) return;
  await prisma.room.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), code: `${row.code}::deleted::${id}` },
  });
}

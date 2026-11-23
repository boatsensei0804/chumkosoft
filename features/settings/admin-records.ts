export const trashKinds = {
  course: "รายวิชา",
  room: "ห้องและสถานที่",
  classroom: "ห้องเรียน",
  offering: "รายวิชาที่เปิดสอน",
  slot: "คาบในตารางสอน",
  student: "นักเรียน",
  staff: "ครูและบุคลากร",
  admin: "บัญชีแอดมิน",
} as const;

export type TrashKind = keyof typeof trashKinds;
export type AdminChange = "enable" | "disable" | "archive" | "restore";

export type ArchivedRecord = { id: string; label: string; deletedAt: Date | null };

export function isTrashKind(value: unknown): value is TrashKind {
  return typeof value === "string" && Object.hasOwn(trashKinds, value);
}

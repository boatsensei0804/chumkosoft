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

export type ArchiveParent = { kind: "course" | "room" | "classroom" | "offering" | "staff"; id: string };
export type RelatedTrash =
  | { token: string; offerings: number; slots: number }
  | { token: string; enrollments: number };
export type TrashReference = { label: string; count: number; archived?: number; trashKind?: "offering" | "slot" };

export function parseArchiveParent(value: unknown, childKind: TrashKind): ArchiveParent | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(course|room|classroom|offering|staff):([\w-]{1,100})$/u.exec(value);
  if (!match) return undefined;
  const kind = match[1] as ArchiveParent["kind"];
  if (childKind === "offering" && kind !== "offering" || childKind === "slot" && kind !== "course") {
    return { kind, id: match[2] };
  }
  return undefined;
}

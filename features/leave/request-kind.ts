export type AttendanceRequestKind = "SICK" | "PERSONAL" | "LATE";
export const REQUEST_KIND_LABELS: Record<AttendanceRequestKind, string> = { SICK: "ลาป่วย", PERSONAL: "ลากิจ", LATE: "ขอมาสาย" };
export function requestKindLabel(kind: AttendanceRequestKind): string { return REQUEST_KIND_LABELS[kind]; }
export function validArrivalTime(value: string): boolean { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }

export function requestTitle(kind: AttendanceRequestKind): string { return kind === "LATE" ? "คำขอมาสาย" : `คำขอ${requestKindLabel(kind)}`; }

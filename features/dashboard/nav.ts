import type { NavItem } from "./types";

/**
 * Sidebar navigation, grouped to keep any one section within working-memory
 * limits (≤5 items). Groups without a label render their items without a header
 * (the overview lives alone at the top). Role-restricted items carry `roles`.
 */
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [{ key: "overview", label: "ภาพรวม", href: "/dashboard", icon: "dashboard", available: true }],
  },
  {
    label: "ทะเบียนข้อมูล",
    items: [
      { key: "students", label: "นักเรียน", href: "/dashboard/students", icon: "school", available: true },
      { key: "teachers", label: "ครูและบุคลากร", href: "/dashboard/teachers", icon: "groups", available: true },
      { key: "classrooms", label: "ห้องเรียน", href: "/dashboard/classrooms", icon: "class", available: true },
      { key: "courses", label: "รายวิชา", href: "/dashboard/courses", icon: "menu_book", available: true },
      { key: "rooms", label: "ห้องและสถานที่", href: "/dashboard/rooms", icon: "place", available: true },
    ],
  },
  {
    label: "ตารางและเช็คชื่อ",
    items: [
      { key: "timetable", label: "จัดตารางสอน", href: "/dashboard/timetable", icon: "calendar", available: true },
      { key: "attendance", label: "เช็คชื่อ", href: "/dashboard/attendance", icon: "checklist", available: true },
    ],
  },
  {
    label: "สแกนและสื่อสาร",
    items: [
      { key: "faces", label: "ชุดข้อมูลใบหน้า", href: "/dashboard/faces", icon: "face", available: true },
      { key: "guardians", label: "ผู้ปกครอง", href: "/dashboard/guardians", icon: "how_to_reg", available: true },
      { key: "line", label: "LINE / แจ้งเตือน", href: "/dashboard/line", icon: "chat", available: true },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { key: "kiosk", label: "จุดสแกนใบหน้า", href: "/dashboard/kiosk", icon: "scan", available: true, roles: ["ADMIN"] },
      { key: "settings", label: "ตั้งค่าระบบ", href: "/dashboard/settings", icon: "settings", available: true, roles: ["ADMIN"] },
    ],
  },
];

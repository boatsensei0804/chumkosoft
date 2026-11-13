import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  BookOpen,
  MapPin,
  CalendarDays,
  ClipboardCheck,
  ScanFace,
  UserCheck,
  MessageSquare,
  Megaphone,
  Link2,
  ScanLine,
  Settings,
} from "lucide-react";
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
    items: [{ key: "overview", label: "ภาพรวม", href: "/dashboard", icon: LayoutDashboard, available: true }],
  },
  {
    label: "ทะเบียนข้อมูล",
    items: [
      { key: "students", label: "นักเรียน", href: "/dashboard/students", icon: GraduationCap, available: true },
      { key: "teachers", label: "ครูและบุคลากร", href: "/dashboard/teachers", icon: Users, available: true },
      { key: "classrooms", label: "ห้องเรียน", href: "/dashboard/classrooms", icon: School, available: true },
      { key: "courses", label: "รายวิชา", href: "/dashboard/courses", icon: BookOpen, available: true },
      { key: "rooms", label: "ห้องและสถานที่", href: "/dashboard/rooms", icon: MapPin, available: true },
    ],
  },
  {
    label: "ตารางและเช็คชื่อ",
    items: [
      { key: "timetable", label: "จัดตารางสอน", href: "/dashboard/timetable", icon: CalendarDays, available: true },
      { key: "attendance", label: "เช็คชื่อ", href: "/dashboard/attendance", icon: ClipboardCheck, available: true },
    ],
  },
  {
    label: "สแกนและสื่อสาร",
    items: [
      { key: "faces", label: "ชุดข้อมูลใบหน้า", href: "/dashboard/faces", icon: ScanFace, available: true },
      { key: "guardians", label: "ผู้ปกครอง", href: "/dashboard/guardians", icon: UserCheck, available: true },
      { key: "line", label: "LINE / แจ้งเตือน", href: "/dashboard/line", icon: MessageSquare, available: true },
      { key: "my-line", label: "LINE ของฉัน", href: "/dashboard/my-line", icon: Link2, available: true, roles: ["TEACHER"] },
      { key: "line-announcements", label: "ส่งประกาศ LINE", href: "/dashboard/line-announcements", icon: Megaphone, available: true, roles: ["ADMIN"] },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { key: "kiosk", label: "จุดสแกนใบหน้า", href: "/dashboard/kiosk", icon: ScanLine, available: true, roles: ["ADMIN"] },
      { key: "settings", label: "ตั้งค่าระบบ", href: "/dashboard/settings", icon: Settings, available: true, roles: ["ADMIN"] },
    ],
  },
];

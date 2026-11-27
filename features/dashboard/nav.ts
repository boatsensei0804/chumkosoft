import {
  Award,
  BookOpen,
  CalendarDays,
  CalendarX2,
  ClipboardCheck,
  Database,
  GraduationCap,
  LayoutDashboard,
  Link2,
  MapPin,
  Megaphone,
  MessageSquare,
  ScanFace,
  ScanLine,
  School,
  Settings,
  Siren,
  UserCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import type { NavItem } from "./types";

interface NavGroup {
  label?: string;
  icon?: LucideIcon;
  openByDefault?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ key: "overview", label: "ภาพรวม", href: "/dashboard", icon: LayoutDashboard, available: true }],
  },
  {
    label: "งานประจำวัน",
    icon: CalendarDays,
    openByDefault: true,
    items: [
      { key: "attendance", label: "เช็คชื่อ", href: "/dashboard/attendance", icon: ClipboardCheck, available: true },
      { key: "timetable", label: "จัดตารางสอน", href: "/dashboard/timetable", icon: CalendarDays, available: true, roles: ["ADMIN"] },
      { key: "timetable-teacher", label: "ตารางสอนของฉัน", href: "/dashboard/timetable", icon: CalendarDays, available: true, roles: ["TEACHER"] },
      { key: "leave-requests", label: "คำขอลา / ขอมาสาย", href: "/dashboard/leave-requests", icon: CalendarX2, available: true },
      { key: "behavior", label: "คะแนนความประพฤติ", href: "/dashboard/behavior", icon: Award, available: true },
      { key: "emergencies", label: "แจ้งเหตุฉุกเฉิน", href: "/dashboard/emergencies", icon: Siren, available: true },
    ],
  },
  {
    label: "ทะเบียนโรงเรียน",
    icon: Database,
    items: [
      { key: "students", label: "นักเรียน", href: "/dashboard/students", icon: GraduationCap, available: true },
      { key: "teachers", label: "ครูและบุคลากร", href: "/dashboard/teachers", icon: Users, available: true },
      { key: "classrooms", label: "ห้องเรียน", href: "/dashboard/classrooms", icon: School, available: true },
      { key: "courses", label: "รายวิชา", href: "/dashboard/courses", icon: BookOpen, available: true },
      { key: "rooms", label: "ห้องและสถานที่", href: "/dashboard/rooms", icon: MapPin, available: true },
    ],
  },
  {
    label: "ระบบสแกนใบหน้า",
    icon: ScanFace,
    items: [
      { key: "kiosk", label: "จุดสแกนใบหน้า", href: "/dashboard/kiosk", icon: ScanLine, available: true, roles: ["ADMIN"] },
      { key: "faces", label: "ข้อมูลใบหน้านักเรียน", href: "/dashboard/faces", icon: ScanFace, available: true, roles: ["ADMIN"] },
    ],
  },
  {
    label: "ผู้ปกครองและการสื่อสาร",
    icon: MessageSquare,
    items: [
      { key: "guardians", label: "ผู้ปกครอง", href: "/dashboard/guardians", icon: UserCheck, available: true },
      { key: "line", label: "LINE / แจ้งเตือน", href: "/dashboard/line", icon: MessageSquare, available: true, roles: ["ADMIN"] },
      { key: "my-line", label: "LINE ของฉัน", href: "/dashboard/my-line", icon: Link2, available: true, roles: ["TEACHER"] },
      { key: "line-announcements", label: "ส่งประกาศ LINE", href: "/dashboard/line-announcements", icon: Megaphone, available: true, roles: ["ADMIN"] },
    ],
  },
  {
    label: "ดูแลระบบ",
    icon: Settings,
    items: [
      { key: "settings", label: "ตั้งค่าระบบ", href: "/dashboard/settings", icon: Settings, available: true, roles: ["ADMIN"] },
      { key: "records", label: "บัญชีแอดมินและถังขยะ", href: "/dashboard/settings/records", icon: UsersRound, available: true, roles: ["ADMIN"] },
    ],
  },
];

export function getNavGroups(role: Role) {
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}

export function getCurrentNavItem(groups: NavGroup[], pathname: string): NavItem | undefined {
  return groups.flatMap((group) => group.items)
    .filter((item) => item.available && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))))
    .sort((left, right) => right.href.length - left.href.length)[0];
}

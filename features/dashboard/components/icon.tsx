import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";

import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import HowToRegOutlined from "@mui/icons-material/HowToRegOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRounded from "@mui/icons-material/TrendingDownRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import CalendarTodayRounded from "@mui/icons-material/CalendarTodayRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import PlaylistAddCheckRounded from "@mui/icons-material/PlaylistAddCheckRounded";
import FaceOutlined from "@mui/icons-material/FaceOutlined";
import MeetingRoomOutlined from "@mui/icons-material/MeetingRoomOutlined";
import LockResetOutlined from "@mui/icons-material/LockResetOutlined";
import QrCodeScannerRounded from "@mui/icons-material/QrCodeScannerRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import PendingActionsOutlined from "@mui/icons-material/PendingActionsOutlined";

const registry: Record<string, ComponentType<SvgIconProps>> = {
  dashboard: DashboardOutlined,
  school: SchoolOutlined,
  groups: GroupsOutlined,
  menu_book: MenuBookOutlined,
  how_to_reg: HowToRegOutlined,
  insights: InsightsOutlined,
  settings: SettingsOutlined,
  search: SearchRounded,
  notifications: NotificationsNoneRounded,
  menu: MenuRounded,
  close: CloseRounded,
  chevron_down: KeyboardArrowDownRounded,
  trending_up: TrendingUpRounded,
  trending_down: TrendingDownRounded,
  time: AccessTimeRounded,
  place: PlaceOutlined,
  info: InfoOutlined,
  warning: WarningAmberRounded,
  success: CheckCircleOutlineRounded,
  add: AddRounded,
  arrow_forward: ArrowForwardRounded,
  download: FileDownloadOutlined,
  calendar: CalendarTodayRounded,
  filter: FilterListRounded,
  logout: LogoutRounded,
  edit: EditOutlined,
  delete: DeleteOutlineRounded,
  check: CheckRounded,
  checklist: PlaylistAddCheckRounded,
  face: FaceOutlined,
  chat: ChatBubbleOutlineRounded,
  class: MeetingRoomOutlined,
  lock: LockResetOutlined,
  scan: QrCodeScannerRounded,
  visibility: VisibilityOutlined,
  pending_actions: PendingActionsOutlined,
};

interface IconProps extends SvgIconProps {
  name: string;
}

export default function Icon({ name, ...props }: IconProps): React.ReactNode {
  const Component = registry[name];
  if (!Component) return null;
  return <Component {...props} />;
}

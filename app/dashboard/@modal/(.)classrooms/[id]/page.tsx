import RecordRouteDialog from "@/features/dashboard/components/record-route-dialog";
import ClassroomDetailPage from "@/app/dashboard/classrooms/[id]/page";

export default function ClassroomModal({ params }: { params: Promise<{ id: string }> }): React.ReactNode {
  return <RecordRouteDialog title="ข้อมูลห้องเรียน"><ClassroomDetailPage params={params} /></RecordRouteDialog>;
}

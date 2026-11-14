import RecordRouteDialog from "@/features/dashboard/components/record-route-dialog";
import TeacherDetailPage from "@/app/dashboard/teachers/[id]/page";

export default function TeacherModal({ params }: { params: Promise<{ id: string }> }): React.ReactNode {
  return <RecordRouteDialog title="ข้อมูลครูและบุคลากร"><TeacherDetailPage params={params} /></RecordRouteDialog>;
}

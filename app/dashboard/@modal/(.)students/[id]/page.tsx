import RecordRouteDialog from "@/features/dashboard/components/record-route-dialog";
import StudentDetailPage from "@/app/dashboard/students/[id]/page";

export default function StudentModal({ params }: { params: Promise<{ id: string }> }): React.ReactNode {
  return <RecordRouteDialog title="ข้อมูลนักเรียน"><StudentDetailPage params={params} /></RecordRouteDialog>;
}

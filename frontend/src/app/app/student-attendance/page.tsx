import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentAttendanceWorkspace } from "@/features/student-attendance/components/student-attendance-workspace";

export default function StudentAttendancePage() {
  return (
    <PermissionGuard permission="student-attendance.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - حضور الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">حضور وغياب الطلاب</h2>
        </div>
        <StudentAttendanceWorkspace />
      </div>
    </PermissionGuard>
  );
}







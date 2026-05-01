import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentAttendanceWorkspace } from "@/features/student-attendance/components/student-attendance-workspace";

export default function StudentAttendancePage() {
  return (
    <PermissionGuard permission="student-attendance.read">
      <div className="space-y-4">
        <StudentAttendanceWorkspace />
      </div>
    </PermissionGuard>
  );
}







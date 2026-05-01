import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeAttendanceWorkspace } from "@/features/employee-attendance/components/employee-attendance-workspace";

export default function EmployeeAttendancePage() {
  return (
    <PermissionGuard permission="employee-attendance.read">
      <div className="space-y-4">
        <EmployeeAttendanceWorkspace />
      </div>
    </PermissionGuard>
  );
}






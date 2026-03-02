import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeAttendanceWorkspace } from "@/features/employee-attendance/components/employee-attendance-workspace";

export default function EmployeeAttendancePage() {
  return (
    <PermissionGuard permission="employee-attendance.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 03 - HR
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">حضور الموظفين</h2>
        </div>
        <EmployeeAttendanceWorkspace />
      </div>
    </PermissionGuard>
  );
}





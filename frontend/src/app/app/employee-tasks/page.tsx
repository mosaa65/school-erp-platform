import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeTasksWorkspace } from "@/features/employee-tasks/components/employee-tasks-workspace";

export default function EmployeeTasksPage() {
  return (
    <PermissionGuard permission="employee-tasks.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 03 - HR
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مهام الموظفين</h2>
        </div>
        <EmployeeTasksWorkspace />
      </div>
    </PermissionGuard>
  );
}





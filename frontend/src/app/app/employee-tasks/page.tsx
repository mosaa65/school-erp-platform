import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeTasksWorkspace } from "@/features/employee-tasks/components/employee-tasks-workspace";

export default function EmployeeTasksPage() {
  return (
    <PermissionGuard permission="employee-tasks.read">
      <div className="space-y-4">
        <EmployeeTasksWorkspace />
      </div>
    </PermissionGuard>
  );
}






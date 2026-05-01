import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeesWorkspace } from "@/features/employees/components/employees-workspace";

export default function EmployeesPage() {
  return (
    <PermissionGuard permission="employees.read">
      <div className="space-y-4">
        <EmployeesWorkspace />
      </div>
    </PermissionGuard>
  );
}






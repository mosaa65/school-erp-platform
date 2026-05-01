import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeDepartmentsWorkspace } from "@/features/employee-departments/components/employee-departments-workspace";

export default function EmployeeDepartmentsPage() {
  return (
    <PermissionGuard permission="employee-departments.read">
      <div className="space-y-4">
        <EmployeeDepartmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeDepartmentsWorkspace } from "@/features/employee-departments/components/employee-departments-workspace";

export default function EmployeeDepartmentsPage() {
  return (
    <PermissionGuard permission="employee-departments.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أقسام الموظفين</h2>
        </div>
        <EmployeeDepartmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeesWorkspace } from "@/features/employees/components/employees-workspace";

export default function EmployeesPage() {
  return (
    <PermissionGuard permission="employees.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 03 - HR
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الموظفون</h2>
        </div>
        <EmployeesWorkspace />
      </div>
    </PermissionGuard>
  );
}





import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeViolationsWorkspace } from "@/features/employee-violations/components/employee-violations-workspace";

export default function EmployeeViolationsPage() {
  return (
    <PermissionGuard permission="employee-violations.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مخالفات الموظفين</h2>
        </div>
        <EmployeeViolationsWorkspace />
      </div>
    </PermissionGuard>
  );
}






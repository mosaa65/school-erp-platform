import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeTalentsWorkspace } from "@/features/employee-talents/components/employee-talents-workspace";

export default function EmployeeTalentsPage() {
  return (
    <PermissionGuard permission="employee-talents.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مواهب الموظفين</h2>
        </div>
        <EmployeeTalentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






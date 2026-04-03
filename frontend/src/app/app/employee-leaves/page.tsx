import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeLeavesWorkspace } from "@/features/employee-leaves/components/employee-leaves-workspace";

export default function EmployeeLeavesPage() {
  return (
    <PermissionGuard permission="employee-leaves.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">طلبات الإجازات</h2>
        </div>
        <EmployeeLeavesWorkspace />
      </div>
    </PermissionGuard>
  );
}

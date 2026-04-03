import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeLeaveBalancesWorkspace } from "@/features/employee-leave-balances/components/employee-leave-balances-workspace";

export default function EmployeeLeaveBalancesPage() {
  return (
    <PermissionGuard permission="employee-leave-balances.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أرصدة الإجازات</h2>
        </div>
        <EmployeeLeaveBalancesWorkspace />
      </div>
    </PermissionGuard>
  );
}

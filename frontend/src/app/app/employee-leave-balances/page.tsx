import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeLeaveBalancesWorkspace } from "@/features/employee-leave-balances/components/employee-leave-balances-workspace";

export default function EmployeeLeaveBalancesPage() {
  return (
    <PermissionGuard permission="employee-leave-balances.read">
      <div className="space-y-4">
        <EmployeeLeaveBalancesWorkspace />
      </div>
    </PermissionGuard>
  );
}

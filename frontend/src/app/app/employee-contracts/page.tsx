import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeContractsWorkspace } from "@/features/employee-contracts/components/employee-contracts-workspace";

export default function EmployeeContractsPage() {
  return (
    <PermissionGuard permission="employee-contracts.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">عقود الموظفين</h2>
        </div>
        <EmployeeContractsWorkspace />
      </div>
    </PermissionGuard>
  );
}

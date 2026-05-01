import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeContractsWorkspace } from "@/features/employee-contracts/components/employee-contracts-workspace";

export default function EmployeeContractsPage() {
  return (
    <PermissionGuard permission="employee-contracts.read">
      <div className="space-y-4">
        <EmployeeContractsWorkspace />
      </div>
    </PermissionGuard>
  );
}

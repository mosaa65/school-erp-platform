import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeLeavesWorkspace } from "@/features/employee-leaves/components/employee-leaves-workspace";

export default function EmployeeLeavesPage() {
  return (
    <PermissionGuard permission="employee-leaves.read">
      <div className="space-y-4">
        <EmployeeLeavesWorkspace />
      </div>
    </PermissionGuard>
  );
}

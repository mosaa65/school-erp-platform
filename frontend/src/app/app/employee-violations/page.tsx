import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeViolationsWorkspace } from "@/features/employee-violations/components/employee-violations-workspace";

export default function EmployeeViolationsPage() {
  return (
    <PermissionGuard permission="employee-violations.read">
      <div className="space-y-4">
        <EmployeeViolationsWorkspace />
      </div>
    </PermissionGuard>
  );
}






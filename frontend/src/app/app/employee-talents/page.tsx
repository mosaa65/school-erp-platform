import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeTalentsWorkspace } from "@/features/employee-talents/components/employee-talents-workspace";

export default function EmployeeTalentsPage() {
  return (
    <PermissionGuard permission="employee-talents.read">
      <div className="space-y-4">
        <EmployeeTalentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






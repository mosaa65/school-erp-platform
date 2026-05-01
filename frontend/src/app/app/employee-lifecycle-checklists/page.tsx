import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeLifecycleChecklistsWorkspace } from "@/features/employee-lifecycle-checklists/components/employee-lifecycle-checklists-workspace";

export default function EmployeeLifecycleChecklistsPage() {
  return (
    <PermissionGuard permission="employee-lifecycle-checklists.read">
      <div className="space-y-4">
        <EmployeeLifecycleChecklistsWorkspace />
      </div>
    </PermissionGuard>
  );
}

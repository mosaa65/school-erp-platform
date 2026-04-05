import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeLifecycleChecklistsWorkspace } from "@/features/employee-lifecycle-checklists/components/employee-lifecycle-checklists-workspace";

export default function EmployeeLifecycleChecklistsPage() {
  return (
    <PermissionGuard permission="employee-lifecycle-checklists.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            التهيئة وإنهاء الخدمة
          </h2>
        </div>
        <EmployeeLifecycleChecklistsWorkspace />
      </div>
    </PermissionGuard>
  );
}

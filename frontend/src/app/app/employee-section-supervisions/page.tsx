import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeSectionSupervisionsWorkspace } from "@/features/teaching-assignments/employee-section-supervisions/components/employee-section-supervisions-workspace";

export default function EmployeeSectionSupervisionsPage() {
  return (
    <PermissionGuard permission="employee-section-supervisions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">نطاقات إشراف الموظفين</h2>
        </div>
        <EmployeeSectionSupervisionsWorkspace />
      </div>
    </PermissionGuard>
  );
}


import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeSectionSupervisionsWorkspace } from "@/features/teaching-assignments/employee-section-supervisions/components/employee-section-supervisions-workspace";

export default function EmployeeSectionSupervisionsPage() {
  return (
    <PermissionGuard permission="employee-section-supervisions.read">
      <div className="space-y-4">
        <EmployeeSectionSupervisionsWorkspace />
      </div>
    </PermissionGuard>
  );
}


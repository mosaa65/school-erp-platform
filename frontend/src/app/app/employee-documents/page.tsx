import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeDocumentsWorkspace } from "@/features/employee-documents/components/employee-documents-workspace";

export default function EmployeeDocumentsPage() {
  return (
    <PermissionGuard permission="employee-documents.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مستندات الموظفين</h2>
        </div>
        <EmployeeDocumentsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeDocumentsWorkspace } from "@/features/employee-documents/components/employee-documents-workspace";

export default function EmployeeDocumentsPage() {
  return (
    <PermissionGuard permission="employee-documents.read">
      <div className="space-y-4">
        <EmployeeDocumentsWorkspace />
      </div>
    </PermissionGuard>
  );
}

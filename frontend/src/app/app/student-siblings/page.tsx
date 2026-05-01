import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentSiblingsWorkspace } from "@/features/student-siblings/components/student-siblings-workspace";

export default function StudentSiblingsPage() {
  return (
    <PermissionGuard permission="student-siblings.read">
      <div className="space-y-4">
        <StudentSiblingsWorkspace />
      </div>
    </PermissionGuard>
  );
}

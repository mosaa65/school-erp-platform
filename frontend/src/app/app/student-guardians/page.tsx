import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentGuardiansWorkspace } from "@/features/student-guardians/components/student-guardians-workspace";

export default function StudentGuardiansPage() {
  return (
    <PermissionGuard permission="student-guardians.read">
      <div className="space-y-4">
        <StudentGuardiansWorkspace />
      </div>
    </PermissionGuard>
  );
}







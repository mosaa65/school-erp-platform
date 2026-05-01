import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentTalentsWorkspace } from "@/features/student-talents/components/student-talents-workspace";

export default function StudentTalentsPage() {
  return (
    <PermissionGuard permission="student-talents.read">
      <div className="space-y-4">
        <StudentTalentsWorkspace />
      </div>
    </PermissionGuard>
  );
}

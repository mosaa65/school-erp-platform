import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentProblemsWorkspace } from "@/features/student-problems/components/student-problems-workspace";

export default function StudentProblemsPage() {
  return (
    <PermissionGuard permission="student-problems.read">
      <div className="space-y-4">
        <StudentProblemsWorkspace />
      </div>
    </PermissionGuard>
  );
}

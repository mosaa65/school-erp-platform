import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentHomeworksWorkspace } from "@/features/assignments/student-homeworks/components/student-homeworks-workspace";

export default function StudentHomeworksPage() {
  return (
    <PermissionGuard permission="student-homeworks.read">
      <div className="space-y-4">
        <StudentHomeworksWorkspace />
      </div>
    </PermissionGuard>
  );
}







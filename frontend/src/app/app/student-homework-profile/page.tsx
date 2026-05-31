import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentHomeworkProfileWorkspace } from "@/features/assignments/student-homework-profile/components/student-homework-profile-workspace";

export default function StudentHomeworkProfilePage() {
  return (
    <PermissionGuard permission="student-homeworks.read">
      <StudentHomeworkProfileWorkspace />
    </PermissionGuard>
  );
}

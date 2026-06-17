import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkSubmissionsWorkspace } from "@/features/assignments/homework-submissions/components/homework-submissions-workspace";

export default function HomeworkSubmissionsPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={[
        "student-homeworks.read",
        "student-homeworks.bulk-update",
      ]}
    >
      <HomeworkSubmissionsWorkspace />
    </PermissionGuard>
  );
}

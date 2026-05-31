import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkEntryWorkspace } from "@/features/assignments/homework-entry/components/homework-entry-workspace";

export default function HomeworkEntryPage() {
  return (
    <PermissionGuard permission="student-homeworks.bulk-update">
      <HomeworkEntryWorkspace />
    </PermissionGuard>
  );
}

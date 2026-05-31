import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkSupervisionWorkspace } from "@/features/assignments/homework-supervision/components/homework-supervision-workspace";

export default function HomeworkSupervisionPage() {
  return (
    <PermissionGuard permission="homeworks.dashboard">
      <HomeworkSupervisionWorkspace />
    </PermissionGuard>
  );
}

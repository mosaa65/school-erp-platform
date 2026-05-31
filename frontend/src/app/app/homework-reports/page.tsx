import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkReportsWorkspace } from "@/features/assignments/homework-reports/components/homework-reports-workspace";

export default function HomeworkReportsPage() {
  return (
    <PermissionGuard permission="homework-reports.read">
      <HomeworkReportsWorkspace />
    </PermissionGuard>
  );
}

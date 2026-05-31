import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkDashboardWorkspace } from "@/features/assignments/homework-dashboard/components/homework-dashboard-workspace";

export default function HomeworkDashboardPage() {
  return (
    <PermissionGuard permission="homeworks.dashboard">
      <HomeworkDashboardWorkspace />
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkCalendarWorkspace } from "@/features/assignments/homework-calendar/components/homework-calendar-workspace";

export default function HomeworkCalendarPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={["homeworks.read", "homeworks.dashboard"]}
    >
      <HomeworkCalendarWorkspace />
    </PermissionGuard>
  );
}

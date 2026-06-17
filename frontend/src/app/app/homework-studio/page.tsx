import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkStudioWorkspace } from "@/features/assignments/homework-studio/components/homework-studio-workspace";

export default function HomeworkStudioPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={["homeworks.create", "homeworks.read"]}
    >
      <HomeworkStudioWorkspace />
    </PermissionGuard>
  );
}

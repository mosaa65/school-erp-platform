import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworksWorkspace } from "@/features/assignments/homeworks/components/homeworks-workspace";

export default function HomeworksPage() {
  return (
    <PermissionGuard permission="homeworks.read">
      <div className="space-y-4">
        <HomeworksWorkspace />
      </div>
    </PermissionGuard>
  );
}







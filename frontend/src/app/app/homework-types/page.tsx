import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkTypesWorkspace } from "@/features/assignments/homework-types/components/homework-types-workspace";

export default function HomeworkTypesPage() {
  return (
    <PermissionGuard permission="homework-types.read">
      <div className="space-y-4">
        <HomeworkTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}







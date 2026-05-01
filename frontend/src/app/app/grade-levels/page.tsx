import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradeLevelsWorkspace } from "@/features/grade-levels/components/grade-levels-workspace";

export default function GradeLevelsPage() {
  return (
    <PermissionGuard permission="grade-levels.read">
      <div className="space-y-4">
        <GradeLevelsWorkspace />
      </div>
    </PermissionGuard>
  );
}






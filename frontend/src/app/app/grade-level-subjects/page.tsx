import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradeLevelSubjectsWorkspace } from "@/features/grade-level-subjects/components/grade-level-subjects-workspace";

export default function GradeLevelSubjectsPage() {
  return (
    <PermissionGuard permission="grade-level-subjects.read">
      <div className="space-y-4">
        <GradeLevelSubjectsWorkspace />
      </div>
    </PermissionGuard>
  );
}






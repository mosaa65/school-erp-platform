import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SubjectsWorkspace } from "@/features/subjects/components/subjects-workspace";

export default function SubjectsPage() {
  return (
    <PermissionGuard permission="subjects.read">
      <div className="space-y-4">
        <SubjectsWorkspace />
      </div>
    </PermissionGuard>
  );
}






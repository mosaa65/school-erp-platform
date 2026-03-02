import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SubjectsWorkspace } from "@/features/subjects/components/subjects-workspace";

export default function SubjectsPage() {
  return (
    <PermissionGuard permission="subjects.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 02 - Academic Core
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">المواد الدراسية</h2>
        </div>
        <SubjectsWorkspace />
      </div>
    </PermissionGuard>
  );
}





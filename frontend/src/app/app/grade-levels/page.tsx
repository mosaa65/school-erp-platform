import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradeLevelsWorkspace } from "@/features/grade-levels/components/grade-levels-workspace";

export default function GradeLevelsPage() {
  return (
    <PermissionGuard permission="grade-levels.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 02 - Academic Core
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">المراحل/الصفوف</h2>
        </div>
        <GradeLevelsWorkspace />
      </div>
    </PermissionGuard>
  );
}





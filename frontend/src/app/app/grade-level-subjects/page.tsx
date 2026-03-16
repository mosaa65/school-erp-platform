import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradeLevelSubjectsWorkspace } from "@/features/grade-level-subjects/components/grade-level-subjects-workspace";

export default function GradeLevelSubjectsPage() {
  return (
    <PermissionGuard permission="grade-level-subjects.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 02 - النواة الأكاديمية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">ربط الصفوف بالمواد</h2>
        </div>
        <GradeLevelSubjectsWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ClassroomsWorkspace } from "@/features/classrooms/components/classrooms-workspace";

export default function ClassroomsPage() {
  return (
    <PermissionGuard permission="classrooms.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النواة الأكاديمية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفصول / الغرف</h2>
        </div>
        <ClassroomsWorkspace />
      </div>
    </PermissionGuard>
  );
}

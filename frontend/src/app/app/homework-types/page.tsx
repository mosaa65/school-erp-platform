import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkTypesWorkspace } from "@/features/homework-types/components/homework-types-workspace";

export default function HomeworkTypesPage() {
  return (
    <PermissionGuard permission="homework-types.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أنواع الواجبات</h2>
        </div>
        <HomeworkTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}







import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworksWorkspace } from "@/features/assignments/homeworks/components/homeworks-workspace";

export default function HomeworksPage() {
  return (
    <PermissionGuard permission="homeworks.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الواجبات</h2>
        </div>
        <HomeworksWorkspace />
      </div>
    </PermissionGuard>
  );
}







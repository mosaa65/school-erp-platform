import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentHomeworksWorkspace } from "@/features/student-homeworks/components/student-homeworks-workspace";

export default function StudentHomeworksPage() {
  return (
    <PermissionGuard permission="student-homeworks.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">واجبات الطلاب</h2>
        </div>
        <StudentHomeworksWorkspace />
      </div>
    </PermissionGuard>
  );
}







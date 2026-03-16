import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentProblemsWorkspace } from "@/features/student-problems/components/student-problems-workspace";

export default function StudentProblemsPage() {
  return (
    <PermissionGuard permission="student-problems.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مشكلات الطلاب</h2>
        </div>
        <StudentProblemsWorkspace />
      </div>
    </PermissionGuard>
  );
}

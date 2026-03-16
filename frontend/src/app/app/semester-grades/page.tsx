import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SemesterGradesWorkspace } from "@/features/semester-grades/components/semester-grades-workspace";

export default function SemesterGradesPage() {
  return (
    <PermissionGuard permission="semester-grades.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الدرجات الفصلية</h2>
        </div>
        <SemesterGradesWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AnnualGradesWorkspace } from "@/features/grade-aggregation/annual-grades/components/annual-grades-workspace";

export default function AnnualGradesPage() {
  return (
    <PermissionGuard permission="annual-grades.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الدرجات السنوية</h2>
        </div>
        <AnnualGradesWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyGradesWorkspace } from "@/features/grade-aggregation/monthly-grades/components/monthly-grades-workspace";

export default function MonthlyGradesPage() {
  return (
    <PermissionGuard permission="monthly-grades.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الدرجات الشهرية</h2>
        </div>
        <MonthlyGradesWorkspace />
      </div>
    </PermissionGuard>
  );
}






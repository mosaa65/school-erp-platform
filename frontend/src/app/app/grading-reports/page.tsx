import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingReportsWorkspace } from "@/features/results-decisions/grading-reports/components/grading-reports-workspace";

export default function GradingReportsPage() {
  return (
    <PermissionGuard permission="grading-reports.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">تقارير الدرجات</h2>
        </div>
        <GradingReportsWorkspace />
      </div>
    </PermissionGuard>
  );
}






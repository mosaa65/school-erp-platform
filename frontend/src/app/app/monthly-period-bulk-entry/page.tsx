import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyResultsWorkspace } from "@/features/monthly-assessment/components/monthly-results-workspace";

export default function MonthlyPeriodBulkEntryPage() {
  return (
    <PermissionGuard permission="student-period-component-scores.create">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الشهرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الإدخال الجماعي للفترات الشهرية</h2>
        </div>
        <MonthlyResultsWorkspace mode="bulk" />
      </div>
    </PermissionGuard>
  );
}

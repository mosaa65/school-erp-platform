import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyPeriodsWorkspace } from "@/features/monthly-assessment/components/monthly-periods-workspace";

export default function MonthlyAssessmentPeriodsPage() {
  return (
    <PermissionGuard permission="assessment-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الشهرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفترات الشهرية</h2>
        </div>
        <MonthlyPeriodsWorkspace mode="periods" />
      </div>
    </PermissionGuard>
  );
}

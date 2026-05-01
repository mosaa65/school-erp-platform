import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyPeriodsWorkspace } from "@/features/monthly-assessment/components/monthly-periods-workspace";

export default function MonthlyAssessmentPeriodsPage() {
  return (
    <PermissionGuard permission="assessment-periods.read">
      <div className="space-y-4">
        <MonthlyPeriodsWorkspace mode="periods" />
      </div>
    </PermissionGuard>
  );
}

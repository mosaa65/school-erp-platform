import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyResultsWorkspace } from "@/features/monthly-assessment/components/monthly-results-workspace";

export default function MonthlyPeriodComponentScoresPage() {
  return (
    <PermissionGuard permission="student-period-component-scores.read">
      <div className="space-y-4">
        <MonthlyResultsWorkspace mode="scores" />
      </div>
    </PermissionGuard>
  );
}

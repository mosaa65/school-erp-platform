import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyResultsWorkspace } from "@/features/monthly-assessment/components/monthly-results-workspace";

export default function MonthlyPeriodResultsPage() {
  return (
    <PermissionGuard permission="student-period-results.read">
      <div className="space-y-4">
        <MonthlyResultsWorkspace mode="results" />
      </div>
    </PermissionGuard>
  );
}

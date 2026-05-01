import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyResultsWorkspace } from "@/features/monthly-assessment/components/monthly-results-workspace";

export default function MonthlyPeriodBulkEntryPage() {
  return (
    <PermissionGuard permission="student-period-component-scores.create">
      <div className="space-y-4">
        <MonthlyResultsWorkspace mode="bulk" />
      </div>
    </PermissionGuard>
  );
}

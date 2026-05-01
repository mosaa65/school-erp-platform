import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyPeriodsWorkspace } from "@/features/monthly-assessment/components/monthly-periods-workspace";

export default function MonthlyAssessmentComponentsPage() {
  return (
    <PermissionGuard permission="assessment-period-components.read">
      <div className="space-y-4">
        <MonthlyPeriodsWorkspace mode="components" />
      </div>
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingReportsWorkspace } from "@/features/results-decisions/grading-reports/components/grading-reports-workspace";

export default function GradingReportsPage() {
  return (
    <PermissionGuard permission="grading-reports.read">
      <div className="space-y-4">
        <GradingReportsWorkspace />
      </div>
    </PermissionGuard>
  );
}






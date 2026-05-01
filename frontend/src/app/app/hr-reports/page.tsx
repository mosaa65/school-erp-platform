import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HrReportsWorkspace } from "@/features/hr-reports/components/hr-reports-workspace";

export default function HrReportsPage() {
  return (
    <PermissionGuard permission="hr-reports.read">
      <div className="space-y-4">
        <HrReportsWorkspace />
      </div>
    </PermissionGuard>
  );
}






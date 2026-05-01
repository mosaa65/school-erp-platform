import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FinancialReportsWorkspace } from "@/features/financial-reports/components/financial-reports-workspace";

export default function FinancialReportsPage() {
  return (
    <PermissionGuard permission="financial-reports.read">
      <div className="space-y-4">
        <FinancialReportsWorkspace />
      </div>
    </PermissionGuard>
  );
}

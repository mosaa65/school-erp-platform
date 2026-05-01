import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ChartOfAccountsWorkspace } from "@/features/chart-of-accounts/components/chart-of-accounts-workspace";

export default function ChartOfAccountsPage() {
  return (
    <PermissionGuard permission="chart-of-accounts.read">
      <div className="space-y-4">
        <ChartOfAccountsWorkspace />
      </div>
    </PermissionGuard>
  );
}

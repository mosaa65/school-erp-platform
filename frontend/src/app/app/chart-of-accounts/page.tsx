import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ChartOfAccountsWorkspace } from "@/features/chart-of-accounts/components/chart-of-accounts-workspace";

export default function ChartOfAccountsPage() {
  return (
    <PermissionGuard permission="chart-of-accounts.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - النواة المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">دليل الحسابات</h2>
        </div>
        <ChartOfAccountsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FinancialFundsWorkspace } from "@/features/financial-funds/components/financial-funds-workspace";

export default function FinancialFundsPage() {
  return (
    <PermissionGuard permission="financial-funds.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">صناديق التمويل</h2>
        </div>
        <FinancialFundsWorkspace />
      </div>
    </PermissionGuard>
  );
}

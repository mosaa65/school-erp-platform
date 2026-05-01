import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FinancialFundsWorkspace } from "@/features/financial-funds/components/financial-funds-workspace";

export default function FinancialFundsPage() {
  return (
    <PermissionGuard permission="financial-funds.read">
      <div className="space-y-4">
        <FinancialFundsWorkspace />
      </div>
    </PermissionGuard>
  );
}

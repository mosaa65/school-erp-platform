import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { BudgetsWorkspace } from "@/features/budgets/components/budgets-workspace";

export default function BudgetsPage() {
  return (
    <PermissionGuard permission="budgets.read">
      <div className="space-y-4">
        <BudgetsWorkspace />
      </div>
    </PermissionGuard>
  );
}

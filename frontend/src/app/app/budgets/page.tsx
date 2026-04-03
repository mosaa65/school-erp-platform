import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { BudgetsWorkspace } from "@/features/budgets/components/budgets-workspace";

export default function BudgetsPage() {
  return (
    <PermissionGuard permission="budgets.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الميزانيات</h2>
        </div>
        <BudgetsWorkspace />
      </div>
    </PermissionGuard>
  );
}

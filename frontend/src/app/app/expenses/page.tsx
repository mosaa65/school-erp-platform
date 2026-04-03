import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExpensesWorkspace } from "@/features/expenses/components/expenses-workspace";

export default function ExpensesPage() {
  return (
    <PermissionGuard permission="expenses.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">المصروفات</h2>
        </div>
        <ExpensesWorkspace />
      </div>
    </PermissionGuard>
  );
}

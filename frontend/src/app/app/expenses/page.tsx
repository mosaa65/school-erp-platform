import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExpensesWorkspace } from "@/features/expenses/components/expenses-workspace";

export default function ExpensesPage() {
  return (
    <PermissionGuard permission="expenses.read">
      <div className="space-y-4">
        <ExpensesWorkspace />
      </div>
    </PermissionGuard>
  );
}

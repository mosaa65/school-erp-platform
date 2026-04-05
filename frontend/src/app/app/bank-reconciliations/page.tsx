import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { BankReconciliationsWorkspace } from "@/features/bank-reconciliations/components/bank-reconciliations-workspace";

export default function BankReconciliationsPage() {
  return (
    <PermissionGuard permission="bank-reconciliations.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مطابقة البنوك</h2>
        </div>
        <BankReconciliationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

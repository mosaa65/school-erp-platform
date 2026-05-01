import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { BankReconciliationsWorkspace } from "@/features/bank-reconciliations/components/bank-reconciliations-workspace";

export default function BankReconciliationsPage() {
  return (
    <PermissionGuard permission="bank-reconciliations.read">
      <div className="space-y-4">
        <BankReconciliationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PaymentTransactionsWorkspace } from "@/features/payment-transactions/components/payment-transactions-workspace";

export default function PaymentTransactionsPage() {
  return (
    <PermissionGuard permission="payment-transactions.read">
      <div className="space-y-4">
        <PaymentTransactionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PaymentTransactionsWorkspace } from "@/features/payment-transactions/components/payment-transactions-workspace";

export default function PaymentTransactionsPage() {
  return (
    <PermissionGuard permission="payment-transactions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">عمليات الدفع</h2>
        </div>
        <PaymentTransactionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

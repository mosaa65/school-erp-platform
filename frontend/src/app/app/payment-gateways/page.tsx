import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PaymentGatewaysWorkspace } from "@/features/payment-gateways/components/payment-gateways-workspace";

export default function PaymentGatewaysPage() {
  return (
    <PermissionGuard permission="payment-gateways.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">بوابات الدفع</h2>
        </div>
        <PaymentGatewaysWorkspace />
      </div>
    </PermissionGuard>
  );
}

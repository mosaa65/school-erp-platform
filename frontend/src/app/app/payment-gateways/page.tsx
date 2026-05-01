import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PaymentGatewaysWorkspace } from "@/features/payment-gateways/components/payment-gateways-workspace";

export default function PaymentGatewaysPage() {
  return (
    <PermissionGuard permission="payment-gateways.read">
      <div className="space-y-4">
        <PaymentGatewaysWorkspace />
      </div>
    </PermissionGuard>
  );
}

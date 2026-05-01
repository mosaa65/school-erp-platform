import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CurrencyExchangeRatesWorkspace } from "@/features/currency-exchange-rates/components/currency-exchange-rates-workspace";

export default function CurrencyExchangeRatesPage() {
  return (
    <PermissionGuard permission="currency-exchange-rates.read">
      <div className="space-y-4">
        <CurrencyExchangeRatesWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CurrencyExchangeRatesWorkspace } from "@/features/currency-exchange-rates/components/currency-exchange-rates-workspace";

export default function CurrencyExchangeRatesPage() {
  return (
    <PermissionGuard permission="currency-exchange-rates.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - النواة المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أسعار الصرف</h2>
        </div>
        <CurrencyExchangeRatesWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CurrenciesWorkspace } from "@/features/currencies/components/currencies-workspace";

export default function CurrenciesPage() {
  return (
    <PermissionGuard permission="currencies.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - النواة المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">العملات</h2>
        </div>
        <CurrenciesWorkspace />
      </div>
    </PermissionGuard>
  );
}

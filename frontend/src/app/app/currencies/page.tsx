import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CurrenciesWorkspace } from "@/features/currencies/components/currencies-workspace";

export default function CurrenciesPage() {
  return (
    <PermissionGuard permission="currencies.read">
      <div className="space-y-4">
        <CurrenciesWorkspace />
      </div>
    </PermissionGuard>
  );
}

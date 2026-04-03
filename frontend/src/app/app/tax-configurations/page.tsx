import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TaxConfigurationsWorkspace } from "@/features/tax-configurations/components/tax-configurations-workspace";

export default function TaxConfigurationsPage() {
  return (
    <PermissionGuard permission="tax-configurations.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إعدادات الضرائب</h2>
        </div>
        <TaxConfigurationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

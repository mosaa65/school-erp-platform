import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TaxConfigurationsWorkspace } from "@/features/tax-configurations/components/tax-configurations-workspace";

export default function TaxConfigurationsPage() {
  return (
    <PermissionGuard permission="tax-configurations.read">
      <div className="space-y-4">
        <TaxConfigurationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

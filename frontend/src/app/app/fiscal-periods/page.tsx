import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FiscalPeriodsWorkspace } from "@/features/fiscal-periods/components/fiscal-periods-workspace";

export default function FiscalPeriodsPage() {
  return (
    <PermissionGuard permission="fiscal-periods.read">
      <div className="space-y-4">
        <FiscalPeriodsWorkspace />
      </div>
    </PermissionGuard>
  );
}

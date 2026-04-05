import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FiscalPeriodsWorkspace } from "@/features/fiscal-periods/components/fiscal-periods-workspace";

export default function FiscalPeriodsPage() {
  return (
    <PermissionGuard permission="fiscal-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - النواة المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفترات المالية</h2>
        </div>
        <FiscalPeriodsWorkspace />
      </div>
    </PermissionGuard>
  );
}

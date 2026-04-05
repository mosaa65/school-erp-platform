import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { FiscalYearsWorkspace } from "@/features/fiscal-years/components/fiscal-years-workspace";

export default function FiscalYearsPage() {
  return (
    <PermissionGuard permission="fiscal-years.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - النواة المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">السنوات المالية</h2>
        </div>
        <FiscalYearsWorkspace />
      </div>
    </PermissionGuard>
  );
}

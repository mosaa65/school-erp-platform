import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyComponentLinksWorkspace } from "@/features/assessment-periods/components/monthly-component-links-workspace";

export default function MonthlyComponentLinksPage() {
  return (
    <PermissionGuard permission="assessment-period-components.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الشهرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مصادر مكونات الفترات الشهرية</h2>
        </div>
        <MonthlyComponentLinksWorkspace />
      </div>
    </PermissionGuard>
  );
}

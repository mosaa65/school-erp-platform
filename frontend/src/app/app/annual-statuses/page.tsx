import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AnnualStatusesWorkspace } from "@/features/annual-statuses/components/annual-statuses-workspace";

export default function AnnualStatusesPage() {
  return (
    <PermissionGuard permission="annual-statuses.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الحالات السنوية</h2>
        </div>
        <AnnualStatusesWorkspace />
      </div>
    </PermissionGuard>
  );
}






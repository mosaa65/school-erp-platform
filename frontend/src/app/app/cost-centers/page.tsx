import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CostCentersWorkspace } from "@/features/cost-centers/components/cost-centers-workspace";

export default function CostCentersPage() {
  return (
    <PermissionGuard permission="cost-centers.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مراكز التكلفة</h2>
        </div>
        <CostCentersWorkspace />
      </div>
    </PermissionGuard>
  );
}

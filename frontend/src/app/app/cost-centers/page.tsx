import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CostCentersWorkspace } from "@/features/cost-centers/components/cost-centers-workspace";

export default function CostCentersPage() {
  return (
    <PermissionGuard permission="cost-centers.read">
      <div className="space-y-4">
        <CostCentersWorkspace />
      </div>
    </PermissionGuard>
  );
}

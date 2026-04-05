import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { BranchesWorkspace } from "@/features/branches/components/branches-workspace";

export default function BranchesPage() {
  return (
    <PermissionGuard permission="branches.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - النواة المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفروع</h2>
        </div>
        <BranchesWorkspace />
      </div>
    </PermissionGuard>
  );
}

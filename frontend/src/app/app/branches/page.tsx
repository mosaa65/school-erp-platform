import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { BranchesWorkspace } from "@/features/branches/components/branches-workspace";

export default function BranchesPage() {
  return (
    <PermissionGuard permission="branches.read">
      <div className="space-y-4">
        <BranchesWorkspace />
      </div>
    </PermissionGuard>
  );
}

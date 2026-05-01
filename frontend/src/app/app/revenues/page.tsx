import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RevenuesWorkspace } from "@/features/revenues/components/revenues-workspace";

export default function RevenuesPage() {
  return (
    <PermissionGuard permission="revenues.read">
      <div className="space-y-4">
        <RevenuesWorkspace />
      </div>
    </PermissionGuard>
  );
}

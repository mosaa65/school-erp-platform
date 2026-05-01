import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupOrphanStatusesWorkspace } from "@/features/lookup-orphan-statuses/components/lookup-orphan-statuses-workspace";

export default function LookupOrphanStatusesPage() {
  return (
    <PermissionGuard permission="lookup-orphan-statuses.read">
      <div className="space-y-4">
        <LookupOrphanStatusesWorkspace />
      </div>
    </PermissionGuard>
  );
}

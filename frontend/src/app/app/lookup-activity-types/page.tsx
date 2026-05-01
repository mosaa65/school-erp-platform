import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupActivityTypesWorkspace } from "@/features/lookup-activity-types/components/lookup-activity-types-workspace";

export default function LookupActivityTypesPage() {
  return (
    <PermissionGuard permission="lookup-activity-types.read">
      <div className="space-y-4">
        <LookupActivityTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupPeriodsWorkspace } from "@/features/lookup-periods/components/lookup-periods-workspace";

export default function LookupPeriodsPage() {
  return (
    <PermissionGuard permission="lookup-periods.read">
      <div className="space-y-4">
        <LookupPeriodsWorkspace />
      </div>
    </PermissionGuard>
  );
}





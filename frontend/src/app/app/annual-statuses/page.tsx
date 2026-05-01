import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AnnualStatusesWorkspace } from "@/features/results-decisions/annual-statuses/components/annual-statuses-workspace";

export default function AnnualStatusesPage() {
  return (
    <PermissionGuard permission="annual-statuses.read">
      <div className="space-y-4">
        <AnnualStatusesWorkspace />
      </div>
    </PermissionGuard>
  );
}






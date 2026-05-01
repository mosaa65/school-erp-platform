import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyComponentLinksWorkspace } from "@/features/assessment-periods/components/monthly-component-links-workspace";

export default function MonthlyComponentLinksPage() {
  return (
    <PermissionGuard permission="assessment-period-components.read">
      <div className="space-y-4">
        <MonthlyComponentLinksWorkspace />
      </div>
    </PermissionGuard>
  );
}

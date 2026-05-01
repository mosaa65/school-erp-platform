import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RecurringJournalsWorkspace } from "@/features/recurring-journals/components/recurring-journals-workspace";

export default function RecurringJournalsPage() {
  return (
    <PermissionGuard permission="recurring-journals.read">
      <div className="space-y-4">
        <RecurringJournalsWorkspace />
      </div>
    </PermissionGuard>
  );
}

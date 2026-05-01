import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RemindersTickerWorkspace } from "@/features/reminders-ticker/components/reminders-ticker-workspace";

export default function RemindersTickerPage() {
  return (
    <PermissionGuard permission="reminders-ticker.read">
      <div className="space-y-4">
        <RemindersTickerWorkspace />
      </div>
    </PermissionGuard>
  );
}

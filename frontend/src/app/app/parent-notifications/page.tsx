import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ParentNotificationsWorkspace } from "@/features/parent-notifications/components/parent-notifications-workspace";

export default function ParentNotificationsPage() {
  return (
    <PermissionGuard permission="parent-notifications.read">
      <div className="space-y-4">
        <ParentNotificationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

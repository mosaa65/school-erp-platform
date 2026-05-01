import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { UserNotificationsWorkspace } from "@/features/user-notifications/components/user-notifications-workspace";

export default function UserNotificationsPage() {
  return (
    <PermissionGuard permission="user-notifications.read">
      <div className="space-y-4">
        <UserNotificationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

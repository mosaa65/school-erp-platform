import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { UserNotificationsWorkspace } from "@/features/user-notifications/components/user-notifications-workspace";

export default function UserNotificationsPage() {
  return (
    <PermissionGuard permission="user-notifications.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إشعاراتي</h2>
        </div>
        <UserNotificationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

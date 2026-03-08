import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ParentNotificationsWorkspace } from "@/features/parent-notifications/components/parent-notifications-workspace";

export default function ParentNotificationsPage() {
  return (
    <PermissionGuard permission="parent-notifications.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إشعارات أولياء الأمور</h2>
        </div>
        <ParentNotificationsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { UserPermissionsWorkspace } from "@/features/user-permissions/components/user-permissions-workspace";

export default function UserPermissionsPage() {
  return (
    <PermissionGuard permission="user-permissions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الصلاحيات المباشرة للمستخدمين</h2>
        </div>
        <UserPermissionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

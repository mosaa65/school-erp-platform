import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PermissionsManagementWorkspace } from "@/features/permissions/components/permissions-management-workspace";

export default function PermissionsPage() {
  return (
    <PermissionGuard permission="permissions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 01 - Permissions
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إدارة الصلاحيات</h2>
        </div>
        <PermissionsManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}





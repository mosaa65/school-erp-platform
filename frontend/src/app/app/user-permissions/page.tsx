import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { UserPermissionsWorkspace } from "@/features/user-permissions/components/user-permissions-workspace";

export default function UserPermissionsPage() {
  return (
    <PermissionGuard permission="user-permissions.read">
      <div className="space-y-4">
        <UserPermissionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PermissionsManagementWorkspace } from "@/features/permissions/components/permissions-management-workspace";

export default function PermissionsPage() {
  return (
    <PermissionGuard permission="permissions.read">
      <div className="space-y-4">
        <PermissionsManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RolesManagementWorkspace } from "@/features/roles/components/roles-management-workspace";

export default function RolesPage() {
  return (
    <PermissionGuard permission="roles.read">
      <div className="space-y-4">
        <RolesManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}






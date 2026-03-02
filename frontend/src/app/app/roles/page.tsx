import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RolesManagementWorkspace } from "@/features/roles/components/roles-management-workspace";

export default function RolesPage() {
  return (
    <PermissionGuard permission="roles.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 01 - Roles
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إدارة الأدوار</h2>
        </div>
        <RolesManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}





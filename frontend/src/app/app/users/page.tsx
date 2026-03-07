import { Users } from "lucide-react";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { UsersManagementWorkspace } from "@/features/users/components/users-management-workspace";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  return (
    <PermissionGuard permission="users.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit gap-1.5">
            <Users className="h-4 w-4" />
            النظام 01 - المستخدمون
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إدارة المستخدمين</h2>
          <p className="text-sm text-muted-foreground">
            CRUD كامل للمستخدمين: إنشاء، تعديل، حذف ناعم، تفعيل/تعطيل، وربط/فك
            ربط الموظف.
          </p>
        </div>

        <UsersManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}






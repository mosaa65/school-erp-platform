import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RevenuesWorkspace } from "@/features/revenues/components/revenues-workspace";

export default function RevenuesPage() {
  return (
    <PermissionGuard permission="revenues.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الإيرادات</h2>
        </div>
        <RevenuesWorkspace />
      </div>
    </PermissionGuard>
  );
}

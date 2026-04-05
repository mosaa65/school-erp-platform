import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AuditTrailWorkspace } from "@/features/audit-trail/components/audit-trail-workspace";

export default function AuditTrailPage() {
  return (
    <PermissionGuard permission="audit-trail.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المالية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">سجل الأثر المالي</h2>
        </div>
        <AuditTrailWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AuditTrailWorkspace } from "@/features/audit-trail/components/audit-trail-workspace";

export default function AuditTrailPage() {
  return (
    <PermissionGuard permission="audit-trail.read">
      <div className="space-y-4">
        <AuditTrailWorkspace />
      </div>
    </PermissionGuard>
  );
}

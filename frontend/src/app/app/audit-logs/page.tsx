import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AuditLogsWorkspace } from "@/features/audit-logs/components/audit-logs-workspace";

export default function AuditLogsPage() {
  return (
    <PermissionGuard permission="audit-logs.read">
      <div className="space-y-4">
        <AuditLogsWorkspace />
      </div>
    </PermissionGuard>
  );
}






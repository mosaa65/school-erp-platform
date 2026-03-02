import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AuditLogsWorkspace } from "@/features/audit-logs/components/audit-logs-workspace";

export default function AuditLogsPage() {
  return (
    <PermissionGuard permission="audit-logs.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 01 - Audit Logs
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">سجل التدقيق</h2>
        </div>
        <AuditLogsWorkspace />
      </div>
    </PermissionGuard>
  );
}





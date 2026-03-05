import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupOrphanStatusesWorkspace } from "@/features/lookup-orphan-statuses/components/lookup-orphan-statuses-workspace";

export default function LookupOrphanStatusesPage() {
  return (
    <PermissionGuard permission="lookup-orphan-statuses.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">حالات اليتم</h2>
        </div>
        <LookupOrphanStatusesWorkspace />
      </div>
    </PermissionGuard>
  );
}

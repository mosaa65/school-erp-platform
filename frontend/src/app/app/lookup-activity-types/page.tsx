import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupActivityTypesWorkspace } from "@/features/lookup-activity-types/components/lookup-activity-types-workspace";

export default function LookupActivityTypesPage() {
  return (
    <PermissionGuard permission="lookup-activity-types.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أنواع الأنشطة</h2>
        </div>
        <LookupActivityTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}

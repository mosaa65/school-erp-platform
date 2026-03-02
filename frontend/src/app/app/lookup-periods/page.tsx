import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupPeriodsWorkspace } from "@/features/lookup-periods/components/lookup-periods-workspace";

export default function LookupPeriodsPage() {
  return (
    <PermissionGuard permission="lookup-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفترات</h2>
        </div>
        <LookupPeriodsWorkspace />
      </div>
    </PermissionGuard>
  );
}





import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupBloodTypesWorkspace } from "@/features/lookup-blood-types/components/lookup-blood-types-workspace";

export default function LookupBloodTypesPage() {
  return (
    <PermissionGuard permission="lookup-blood-types.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">فصائل الدم</h2>
        </div>
        <LookupBloodTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}





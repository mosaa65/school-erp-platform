import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupIdTypesWorkspace } from "@/features/lookup-id-types/components/lookup-id-types-workspace";

export default function LookupIdTypesPage() {
  return (
    <PermissionGuard permission="lookup-id-types.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أنواع الهوية</h2>
        </div>
        <LookupIdTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}





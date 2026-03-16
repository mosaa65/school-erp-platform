import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupOwnershipTypesWorkspace } from "@/features/lookup-ownership-types/components/lookup-ownership-types-workspace";

export default function LookupOwnershipTypesPage() {
  return (
    <PermissionGuard permission="lookup-ownership-types.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أنواع الملكية</h2>
        </div>
        <LookupOwnershipTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}





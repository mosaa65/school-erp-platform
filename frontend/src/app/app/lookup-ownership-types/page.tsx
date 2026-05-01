import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupOwnershipTypesWorkspace } from "@/features/lookup-ownership-types/components/lookup-ownership-types-workspace";

export default function LookupOwnershipTypesPage() {
  return (
    <PermissionGuard permission="lookup-ownership-types.read">
      <div className="space-y-4">
        <LookupOwnershipTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}





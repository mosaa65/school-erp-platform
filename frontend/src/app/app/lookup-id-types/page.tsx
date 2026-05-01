import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupIdTypesWorkspace } from "@/features/lookup-id-types/components/lookup-id-types-workspace";

export default function LookupIdTypesPage() {
  return (
    <PermissionGuard permission="lookup-id-types.read">
      <div className="space-y-4">
        <LookupIdTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}





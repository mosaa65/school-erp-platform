import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupBloodTypesWorkspace } from "@/features/lookup-blood-types/components/lookup-blood-types-workspace";

export default function LookupBloodTypesPage() {
  return (
    <PermissionGuard permission="lookup-blood-types.read">
      <div className="space-y-4">
        <LookupBloodTypesWorkspace />
      </div>
    </PermissionGuard>
  );
}





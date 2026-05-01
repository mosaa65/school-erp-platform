import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GuardiansWorkspace } from "@/features/guardians/components/guardians-workspace";

export default function GuardiansPage() {
  return (
    <PermissionGuard requiredAnyPermission={["guardians.read.summary", "guardians.read"]}>
      <div className="space-y-4">
        <GuardiansWorkspace />
      </div>
    </PermissionGuard>
  );
}





import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GuardiansWorkspace } from "@/features/guardians/components/guardians-workspace";

export default function GuardiansPage() {
  return (
    <PermissionGuard permission="guardians.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 04 - Students
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أولياء الأمور</h2>
        </div>
        <GuardiansWorkspace />
      </div>
    </PermissionGuard>
  );
}





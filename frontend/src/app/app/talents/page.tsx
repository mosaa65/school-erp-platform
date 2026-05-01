import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TalentsWorkspace } from "@/features/talents/components/talents-workspace";

export default function TalentsPage() {
  return (
    <PermissionGuard permission="talents.read">
      <div className="space-y-4">
        <TalentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






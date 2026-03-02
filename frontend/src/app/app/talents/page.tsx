import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TalentsWorkspace } from "@/features/talents/components/talents-workspace";

export default function TalentsPage() {
  return (
    <PermissionGuard permission="talents.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 03 - HR
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">المواهب</h2>
        </div>
        <TalentsWorkspace />
      </div>
    </PermissionGuard>
  );
}





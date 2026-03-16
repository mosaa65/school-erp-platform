import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentTalentsWorkspace } from "@/features/student-talents/components/student-talents-workspace";

export default function StudentTalentsPage() {
  return (
    <PermissionGuard permission="student-talents.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مواهب الطلاب</h2>
        </div>
        <StudentTalentsWorkspace />
      </div>
    </PermissionGuard>
  );
}

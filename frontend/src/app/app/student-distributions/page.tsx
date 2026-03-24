import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentDistributionsWorkspace } from "@/features/student-distributions/components/student-distributions-workspace";

export default function StudentDistributionsPage() {
  return (
    <PermissionGuard permission="student-enrollments.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            إدارة توزيع الطلاب على الشعب
          </h2>
        </div>
        <StudentDistributionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentEnrollmentsWorkspace } from "@/features/student-enrollments/components/student-enrollments-workspace";

export default function StudentEnrollmentsPage() {
  return (
    <PermissionGuard permission="student-enrollments.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">قيود الطلاب</h2>
        </div>
        <StudentEnrollmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}







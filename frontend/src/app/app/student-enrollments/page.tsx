import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentEnrollmentsWorkspace } from "@/features/student-enrollments/components/student-enrollments-workspace";

export default function StudentEnrollmentsPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={["student-enrollments.read.summary", "student-enrollments.read"]}
    >
      <div className="space-y-4">
        <StudentEnrollmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






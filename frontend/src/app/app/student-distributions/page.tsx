import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentDistributionsWorkspace } from "@/features/student-distributions/components/student-distributions-workspace";

export default function StudentDistributionsPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={["student-enrollments.read.summary", "student-enrollments.read"]}
    >
      <div className="space-y-4">
        <StudentDistributionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

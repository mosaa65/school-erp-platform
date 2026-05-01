import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeCoursesWorkspace } from "@/features/employee-courses/components/employee-courses-workspace";

export default function EmployeeCoursesPage() {
  return (
    <PermissionGuard permission="employee-courses.read">
      <div className="space-y-4">
        <EmployeeCoursesWorkspace />
      </div>
    </PermissionGuard>
  );
}






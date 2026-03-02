import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeCoursesWorkspace } from "@/features/employee-courses/components/employee-courses-workspace";

export default function EmployeeCoursesPage() {
  return (
    <PermissionGuard permission="employee-courses.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 03 - HR
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">دورات الموظفين</h2>
        </div>
        <EmployeeCoursesWorkspace />
      </div>
    </PermissionGuard>
  );
}





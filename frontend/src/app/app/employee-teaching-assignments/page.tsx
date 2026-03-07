import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeTeachingAssignmentsWorkspace } from "@/features/employee-teaching-assignments/components/employee-teaching-assignments-workspace";

export default function EmployeeTeachingAssignmentsPage() {
  return (
    <PermissionGuard permission="employee-teaching-assignments.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إسناد التدريس للموظفين</h2>
        </div>
        <EmployeeTeachingAssignmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






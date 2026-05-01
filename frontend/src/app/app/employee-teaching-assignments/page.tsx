import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeeTeachingAssignmentsWorkspace } from "@/features/teaching-assignments/employee-teaching-assignments/components/employee-teaching-assignments-workspace";

export default function EmployeeTeachingAssignmentsPage() {
  return (
    <PermissionGuard permission="employee-teaching-assignments.read">
      <div className="space-y-4">
        <EmployeeTeachingAssignmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






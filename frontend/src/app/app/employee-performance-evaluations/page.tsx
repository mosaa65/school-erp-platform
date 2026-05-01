import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeePerformanceEvaluationsWorkspace } from "@/features/employee-performance-evaluations/components/employee-performance-evaluations-workspace";

export default function EmployeePerformanceEvaluationsPage() {
  return (
    <PermissionGuard permission="employee-performance-evaluations.read">
      <div className="space-y-4">
        <EmployeePerformanceEvaluationsWorkspace />
      </div>
    </PermissionGuard>
  );
}






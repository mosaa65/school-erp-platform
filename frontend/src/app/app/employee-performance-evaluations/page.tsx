import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { EmployeePerformanceEvaluationsWorkspace } from "@/features/employee-performance-evaluations/components/employee-performance-evaluations-workspace";

export default function EmployeePerformanceEvaluationsPage() {
  return (
    <PermissionGuard permission="employee-performance-evaluations.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 03 - الموارد البشرية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">تقييمات الأداء</h2>
        </div>
        <EmployeePerformanceEvaluationsWorkspace />
      </div>
    </PermissionGuard>
  );
}






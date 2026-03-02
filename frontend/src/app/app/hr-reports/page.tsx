import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HrReportsWorkspace } from "@/features/hr-reports/components/hr-reports-workspace";

export default function HrReportsPage() {
  return (
    <PermissionGuard permission="hr-reports.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 03 - HR
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">تقارير الموارد البشرية</h2>
        </div>
        <HrReportsWorkspace />
      </div>
    </PermissionGuard>
  );
}





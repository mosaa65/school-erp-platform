import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AnnualResultsWorkspace } from "@/features/annual-results/components/annual-results-workspace";

export default function AnnualResultsPage() {
  return (
    <PermissionGuard permission="annual-results.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 05 - Teaching & Grades
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">النتائج السنوية</h2>
        </div>
        <AnnualResultsWorkspace />
      </div>
    </PermissionGuard>
  );
}





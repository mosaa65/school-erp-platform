import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingPoliciesWorkspace } from "@/features/grading-policies/components/grading-policies-workspace";

export default function GradingPoliciesPage() {
  return (
    <PermissionGuard permission="grading-policies.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 05 - Teaching & Grades
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">سياسات الدرجات</h2>
        </div>
        <GradingPoliciesWorkspace />
      </div>
    </PermissionGuard>
  );
}





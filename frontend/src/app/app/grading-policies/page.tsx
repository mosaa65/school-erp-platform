import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingPoliciesWorkspace } from "@/features/evaluation-policies/grading-policies/components/grading-policies-workspace";

export default function GradingPoliciesPage() {
  return (
    <PermissionGuard permission="grading-policies.read">
      <div className="space-y-4">
        <GradingPoliciesWorkspace />
      </div>
    </PermissionGuard>
  );
}






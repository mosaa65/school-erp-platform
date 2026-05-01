import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingOutcomeRulesWorkspace } from "@/features/evaluation-policies/grading-outcome-rules/components/grading-outcome-rules-workspace";

export default function GradingOutcomeRulesPage() {
  return (
    <PermissionGuard permission="grading-outcome-rules.read">
      <div className="space-y-4">
        <GradingOutcomeRulesWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingOutcomeRulesWorkspace } from "@/features/grading-outcome-rules/components/grading-outcome-rules-workspace";

export default function GradingOutcomeRulesPage() {
  return (
    <PermissionGuard permission="grading-outcome-rules.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">قواعد احتساب النتائج</h2>
        </div>
        <GradingOutcomeRulesWorkspace />
      </div>
    </PermissionGuard>
  );
}






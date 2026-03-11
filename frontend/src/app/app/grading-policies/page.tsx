import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GradingPoliciesWorkspace } from "@/features/evaluation-policies/grading-policies/components/grading-policies-workspace";

export default function GradingPoliciesPage() {
  return (
    <PermissionGuard permission="grading-policies.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">سياسات الدرجات</h2>
        </div>
        <GradingPoliciesWorkspace />
      </div>
    </PermissionGuard>
  );
}






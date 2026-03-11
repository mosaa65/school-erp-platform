import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { MonthlyCustomComponentScoresWorkspace } from "@/features/grade-aggregation/monthly-custom-component-scores/components/monthly-custom-component-scores-workspace";

export default function MonthlyCustomComponentScoresPage() {
  return (
    <PermissionGuard permission="monthly-custom-component-scores.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            مكونات الدرجات الشهرية الإضافية
          </h2>
        </div>
        <MonthlyCustomComponentScoresWorkspace />
      </div>
    </PermissionGuard>
  );
}






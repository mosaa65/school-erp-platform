import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentPeriodResultsWorkspace } from "@/features/student-period-results/components/student-period-results-workspace";

export default function SemesterPeriodCalculationPage() {
  return (
    <PermissionGuard permission="student-period-results.calculate">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الفصلية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">احتساب الفترات الفصلية</h2>
        </div>
        <StudentPeriodResultsWorkspace
          allowedCategories={["SEMESTER"]}
          fixedWorkspaceView="overview"
          hideWorkspaceSwitcher
          actions={{ createResult: true, createScore: false, ensureResults: true, calculate: true }}
          searchPlaceholder="ابحث في احتساب الفترات الفصلية..."
          labels={{
            workflowTitle: "سير عمل احتساب الفصل",
            contextTitle: "بحث وفلاتر احتساب الفصل",
            quickActionsTitle: "إجراءات احتساب الفصل",
            resultsTitle: "سجلات نتائج الاحتساب",
          }}
          visiblePanels={{ resultDetails: false, bulk: false }}
        />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentPeriodResultsWorkspace } from "@/features/student-period-results/components/student-period-results-workspace";

export default function YearFinalPeriodResultsPage() {
  return (
    <PermissionGuard permission="student-period-results.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات النهائية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">النتائج النهائية</h2>
        </div>
        <StudentPeriodResultsWorkspace
          allowedCategories={["YEAR_FINAL"]}
          fixedWorkspaceView="results"
          hideWorkspaceSwitcher
          actions={{ createResult: true, createScore: true, ensureResults: true, calculate: false }}
          searchPlaceholder="ابحث في النتائج النهائية باسم الطالب..."
          labels={{
            workflowTitle: "سير عمل النتائج النهائية",
            contextTitle: "بحث وفلاتر النتائج النهائية",
            quickActionsTitle: "إجراءات النتائج النهائية",
            resultsTitle: "سجلات النتائج النهائية",
            resultComponentsTitle: "سجلات مكونات النتائج النهائية",
          }}
          visiblePanels={{ resultDetails: true, bulk: false }}
        />
      </div>
    </PermissionGuard>
  );
}

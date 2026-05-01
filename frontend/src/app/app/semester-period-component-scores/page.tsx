import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentPeriodResultsWorkspace } from "@/features/student-period-results/components/student-period-results-workspace";

export default function SemesterPeriodComponentScoresPage() {
  return (
    <PermissionGuard permission="student-period-component-scores.read">
      <div className="space-y-4">
        <StudentPeriodResultsWorkspace
          allowedCategories={["SEMESTER"]}
          fixedWorkspaceView="results"
          hideWorkspaceSwitcher
          actions={{ createResult: false, createScore: true, ensureResults: false, calculate: false }}
          searchPlaceholder="ابحث في درجات مكونات الفصل..."
          labels={{
            workflowTitle: "سير عمل درجات مكونات الفصل",
            contextTitle: "بحث وفلاتر درجات مكونات الفصل",
            quickActionsTitle: "إجراءات درجات مكونات الفصل",
            resultsTitle: "سجلات نتائج الفصل",
            resultComponentsTitle: "سجلات درجات مكونات الفصل",
          }}
          visiblePanels={{ resultDetails: true, bulk: false }}
        />
      </div>
    </PermissionGuard>
  );
}

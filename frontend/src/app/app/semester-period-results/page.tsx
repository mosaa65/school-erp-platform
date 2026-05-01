import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentPeriodResultsWorkspace } from "@/features/student-period-results/components/student-period-results-workspace";

export default function SemesterPeriodResultsPage() {
  return (
    <PermissionGuard permission="student-period-results.read">
      <div className="space-y-4">
        <StudentPeriodResultsWorkspace
          allowedCategories={["SEMESTER"]}
          fixedWorkspaceView="results"
          hideWorkspaceSwitcher
          actions={{ createResult: true, createScore: false, ensureResults: true, calculate: false }}
          searchPlaceholder="ابحث في نتائج الفصل باسم الطالب..."
          labels={{
            workflowTitle: "سير عمل نتائج الفصل",
            contextTitle: "بحث وفلاتر نتائج الفصل",
            quickActionsTitle: "إجراءات النتائج الفصلية",
            resultsTitle: "سجلات النتائج الفصلية",
          }}
          visiblePanels={{ resultDetails: false, bulk: false }}
        />
      </div>
    </PermissionGuard>
  );
}

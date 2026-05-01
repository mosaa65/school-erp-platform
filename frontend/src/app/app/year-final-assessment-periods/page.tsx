import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function YearFinalAssessmentPeriodsPage() {
  return (
    <PermissionGuard permission="assessment-periods.read">
      <div className="space-y-4">
        <AssessmentPeriodsWorkspace
          allowedCategories={["YEAR_FINAL"]}
          fixedWorkspaceView="overview"
          hideWorkspaceSwitcher
          actions={{ createPeriod: true, createComponent: false, createSource: false }}
          searchPlaceholder="ابحث في الفترات النهائية..."
          labels={{
            workflowTitle: "سير عمل الفترات النهائية",
            contextTitle: "بحث وفلاتر الفترات النهائية",
            periodsTitle: "سجلات الفترات النهائية",
          }}
          visiblePanels={{ components: false, sources: false }}
        />
      </div>
    </PermissionGuard>
  );
}

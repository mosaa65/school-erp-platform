import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function SemesterAssessmentPeriodsPage() {
  return (
    <PermissionGuard permission="assessment-periods.read">
      <div className="space-y-4">
        <AssessmentPeriodsWorkspace
          allowedCategories={["SEMESTER"]}
          fixedWorkspaceView="overview"
          hideWorkspaceSwitcher
          actions={{ createPeriod: true, createComponent: false, createSource: false }}
          searchPlaceholder="ابحث في الفترات الفصلية..."
          labels={{
            workflowTitle: "سير عمل الفترات الفصلية",
            contextTitle: "بحث وفلاتر الفترات الفصلية",
            periodsTitle: "سجلات الفترات الفصلية",
          }}
          visiblePanels={{ components: false, sources: false }}
        />
      </div>
    </PermissionGuard>
  );
}

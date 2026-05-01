import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function SemesterAggregateLinksPage() {
  return (
    <PermissionGuard permission="assessment-component-source-periods.read">
      <div className="space-y-4">
        <AssessmentPeriodsWorkspace
          allowedCategories={["SEMESTER"]}
          fixedWorkspaceView="sources"
          hideWorkspaceSwitcher
          actions={{ createPeriod: false, createComponent: false, createSource: true }}
          componentEntryModes={["AGGREGATED_PERIODS"]}
          searchPlaceholder="ابحث في روابط المحصلة الفصلية..."
          labels={{
            workflowTitle: "سير عمل المحصلة الفصلية",
            contextTitle: "بحث وفلاتر المحصلة الفصلية",
            periodsTitle: "سجلات الفترات الفصلية",
            componentsTitle: "سجلات مكونات المحصلة",
            sourcesTitle: "سجلات ربط المحصلة الفصلية",
          }}
          visiblePanels={{ components: true, sources: true }}
        />
      </div>
    </PermissionGuard>
  );
}

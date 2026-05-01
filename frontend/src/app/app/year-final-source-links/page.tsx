import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function YearFinalSourceLinksPage() {
  return (
    <PermissionGuard permission="assessment-component-source-periods.read">
      <div className="space-y-4">
        <AssessmentPeriodsWorkspace
          allowedCategories={["YEAR_FINAL"]}
          fixedWorkspaceView="sources"
          hideWorkspaceSwitcher
          actions={{ createPeriod: false, createComponent: false, createSource: true }}
          componentEntryModes={["AGGREGATED_PERIODS"]}
          searchPlaceholder="ابحث في روابط المصادر النهائية..."
          labels={{
            workflowTitle: "سير عمل مصادر النهائي",
            contextTitle: "بحث وفلاتر مصادر النهائي",
            periodsTitle: "سجلات الفترات النهائية",
            componentsTitle: "سجلات مكونات النهائي المجمعة",
            sourcesTitle: "سجلات ربط مصادر النهائي",
          }}
          visiblePanels={{ components: true, sources: true }}
        />
      </div>
    </PermissionGuard>
  );
}

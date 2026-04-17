import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function SemesterAggregateLinksPage() {
  return (
    <PermissionGuard permission="assessment-component-source-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الفصلية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مصادر المحصلة للفترة الفصلية</h2>
        </div>
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

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function YearFinalSourceLinksPage() {
  return (
    <PermissionGuard permission="assessment-component-source-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات النهائية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مصادر الفترات النهائية من الفصول</h2>
        </div>
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

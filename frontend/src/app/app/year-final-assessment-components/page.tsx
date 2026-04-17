import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function YearFinalAssessmentComponentsPage() {
  return (
    <PermissionGuard permission="assessment-period-components.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات النهائية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مكونات الفترات النهائية</h2>
        </div>
        <AssessmentPeriodsWorkspace
          allowedCategories={["YEAR_FINAL"]}
          fixedWorkspaceView="components"
          hideWorkspaceSwitcher
          actions={{ createPeriod: false, createComponent: true, createSource: false }}
          searchPlaceholder="ابحث في مكونات الفترات النهائية..."
          labels={{
            workflowTitle: "سير عمل مكونات النهائي",
            contextTitle: "بحث وفلاتر مكونات النهائي",
            periodsTitle: "سجلات الفترات النهائية",
            componentsTitle: "سجلات مكونات الفترات النهائية",
          }}
          visiblePanels={{ components: true, sources: false }}
        />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function SemesterAssessmentComponentsPage() {
  return (
    <PermissionGuard permission="assessment-period-components.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الفصلية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مكونات الفترات الفصلية</h2>
        </div>
        <AssessmentPeriodsWorkspace
          allowedCategories={["SEMESTER"]}
          fixedWorkspaceView="components"
          hideWorkspaceSwitcher
          actions={{ createPeriod: false, createComponent: true, createSource: false }}
          searchPlaceholder="ابحث في مكونات الفترات الفصلية..."
          labels={{
            workflowTitle: "سير عمل مكونات الفصل",
            contextTitle: "بحث وفلاتر مكونات الفصل",
            periodsTitle: "سجلات الفترات الفصلية",
            componentsTitle: "سجلات مكونات الفترات الفصلية",
          }}
          visiblePanels={{ components: true, sources: false }}
        />
      </div>
    </PermissionGuard>
  );
}

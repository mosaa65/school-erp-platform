import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssessmentPeriodsWorkspace } from "@/features/assessment-periods/components/assessment-periods-workspace";

export default function SemesterAssessmentPeriodsPage() {
  return (
    <PermissionGuard permission="assessment-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - الفترات الفصلية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفترات الفصلية</h2>
        </div>
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

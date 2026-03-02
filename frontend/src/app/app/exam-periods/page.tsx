import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExamPeriodsWorkspace } from "@/features/exam-periods/components/exam-periods-workspace";

export default function ExamPeriodsPage() {
  return (
    <PermissionGuard permission="exam-periods.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 05 - Teaching & Grades
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الفترات الاختبارية</h2>
        </div>
        <ExamPeriodsWorkspace />
      </div>
    </PermissionGuard>
  );
}





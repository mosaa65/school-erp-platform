import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExamPeriodsWorkspace } from "@/features/exams/exam-periods/components/exam-periods-workspace";

export default function ExamPeriodsPage() {
  return (
    <PermissionGuard permission="exam-periods.read">
      <div className="space-y-4">
        <ExamPeriodsWorkspace />
      </div>
    </PermissionGuard>
  );
}






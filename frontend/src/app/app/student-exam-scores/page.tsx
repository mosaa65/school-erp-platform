import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentExamScoresWorkspace } from "@/features/exams/student-exam-scores/components/student-exam-scores-workspace";

export default function StudentExamScoresPage() {
  return (
    <PermissionGuard permission="student-exam-scores.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - نظام الاختبارات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">درجات الاختبارات</h2>
        </div>
        <StudentExamScoresWorkspace />
      </div>
    </PermissionGuard>
  );
}






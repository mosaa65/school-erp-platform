import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExamAssessmentsWorkspace } from "@/features/exams/exam-assessments/components/exam-assessments-workspace";

export default function ExamAssessmentsPage() {
  return (
    <PermissionGuard permission="exam-assessments.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الاختبارات</h2>
        </div>
        <ExamAssessmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






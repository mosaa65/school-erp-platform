import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExamAssessmentsWorkspace } from "@/features/exam-assessments/components/exam-assessments-workspace";

export default function ExamAssessmentsPage() {
  return (
    <PermissionGuard permission="exam-assessments.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 05 - Teaching & Grades
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الاختبارات</h2>
        </div>
        <ExamAssessmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}





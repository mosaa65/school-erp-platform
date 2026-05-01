import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ExamAssessmentsWorkspace } from "@/features/exams/exam-assessments/components/exam-assessments-workspace";

export default function ExamAssessmentsPage() {
  return (
    <PermissionGuard permission="exam-assessments.read">
      <div className="space-y-4">
        <ExamAssessmentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






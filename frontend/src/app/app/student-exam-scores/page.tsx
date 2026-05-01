import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentExamScoresWorkspace } from "@/features/exams/student-exam-scores/components/student-exam-scores-workspace";

export default function StudentExamScoresPage() {
  return (
    <PermissionGuard permission="student-exam-scores.read">
      <div className="space-y-4">
        <StudentExamScoresWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentDetailsPageClient } from "@/features/students/components/student-details-page-client";

type StudentDetailsPageProps = {
  params: {
    studentId: string;
  };
};

export default function StudentDetailsPage({ params }: StudentDetailsPageProps) {
  return (
    <PermissionGuard requiredAnyPermission={["students.read", "students.read.details"]}>
      <StudentDetailsPageClient studentId={params.studentId} />
    </PermissionGuard>
  );
}

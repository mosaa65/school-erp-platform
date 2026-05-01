import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentBooksWorkspace } from "@/features/student-books/components/student-books-workspace";

export default function StudentBooksPage() {
  return (
    <PermissionGuard permission="student-books.read">
      <div className="space-y-4">
        <StudentBooksWorkspace />
      </div>
    </PermissionGuard>
  );
}







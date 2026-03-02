import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentBooksWorkspace } from "@/features/student-books/components/student-books-workspace";

export default function StudentBooksPage() {
  return (
    <PermissionGuard permission="student-books.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 04 - Students
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">كتب الطلاب</h2>
        </div>
        <StudentBooksWorkspace />
      </div>
    </PermissionGuard>
  );
}






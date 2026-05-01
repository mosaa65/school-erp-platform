import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentsWorkspace } from "@/features/students/components/students-workspace";

export default function StudentsPage() {
  return (
    <PermissionGuard requiredAnyPermission={["students.read.summary"]}>
      <div className="space-y-4">
        <StudentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentsWorkspace } from "@/features/students/components/students-workspace";

export default function StudentsPage() {
  return (
    <PermissionGuard requiredAnyPermission={["students.read.summary"]}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الطلاب</h2>
        </div>
        <StudentsWorkspace />
      </div>
    </PermissionGuard>
  );
}






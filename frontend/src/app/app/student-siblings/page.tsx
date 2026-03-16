import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { StudentSiblingsWorkspace } from "@/features/student-siblings/components/student-siblings-workspace";

export default function StudentSiblingsPage() {
  return (
    <PermissionGuard permission="student-siblings.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الإخوة في المدرسة</h2>
        </div>
        <StudentSiblingsWorkspace />
      </div>
    </PermissionGuard>
  );
}

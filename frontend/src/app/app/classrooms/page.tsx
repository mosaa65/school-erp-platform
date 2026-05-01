import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { ClassroomsWorkspace } from "@/features/classrooms/components/classrooms-workspace";

export default function ClassroomsPage() {
  return (
    <PermissionGuard permission="classrooms.read">
      <div className="space-y-4">
        <ClassroomsWorkspace />
      </div>
    </PermissionGuard>
  );
}

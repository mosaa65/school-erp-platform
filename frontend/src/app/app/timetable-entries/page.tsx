import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TimetableEntriesWorkspace } from "@/features/timetable-entries/components/timetable-entries-workspace";

export default function TimetableEntriesPage() {
  return (
    <PermissionGuard permission="timetable-entries.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 02 - Academic Core
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الجدول الدراسي</h2>
        </div>
        <TimetableEntriesWorkspace />
      </div>
    </PermissionGuard>
  );
}





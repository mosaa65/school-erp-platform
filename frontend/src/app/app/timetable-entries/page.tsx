import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TimetableEntriesWorkspace } from "@/features/timetable-entries/components/timetable-entries-workspace";

export default function TimetableEntriesPage() {
  return (
    <PermissionGuard permission="timetable-entries.read">
      <div className="space-y-4">
        <TimetableEntriesWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { JournalEntriesWorkspace } from "@/features/journal-entries/components/journal-entries-workspace";

export default function JournalEntriesPage() {
  return (
    <PermissionGuard permission="journal-entries.read">
      <div className="space-y-4">
        <JournalEntriesWorkspace />
      </div>
    </PermissionGuard>
  );
}

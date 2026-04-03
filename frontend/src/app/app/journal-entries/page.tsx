import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { JournalEntriesWorkspace } from "@/features/journal-entries/components/journal-entries-workspace";

export default function JournalEntriesPage() {
  return (
    <PermissionGuard permission="journal-entries.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">القيود اليومية</h2>
        </div>
        <JournalEntriesWorkspace />
      </div>
    </PermissionGuard>
  );
}

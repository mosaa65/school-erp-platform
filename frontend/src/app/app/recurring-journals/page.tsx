import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { RecurringJournalsWorkspace } from "@/features/recurring-journals/components/recurring-journals-workspace";

export default function RecurringJournalsPage() {
  return (
    <PermissionGuard permission="recurring-journals.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">القيود المتكررة</h2>
        </div>
        <RecurringJournalsWorkspace />
      </div>
    </PermissionGuard>
  );
}

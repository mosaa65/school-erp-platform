import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CreditDebitNotesWorkspace } from "@/features/credit-debit-notes/components/credit-debit-notes-workspace";

export default function CreditDebitNotesPage() {
  return (
    <PermissionGuard permission="credit-debit-notes.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 07 - المحاسبة والخزينة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إشعارات دائن/مدين</h2>
        </div>
        <CreditDebitNotesWorkspace />
      </div>
    </PermissionGuard>
  );
}

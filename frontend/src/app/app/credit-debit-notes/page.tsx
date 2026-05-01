import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CreditDebitNotesWorkspace } from "@/features/credit-debit-notes/components/credit-debit-notes-workspace";

export default function CreditDebitNotesPage() {
  return (
    <PermissionGuard permission="credit-debit-notes.read">
      <div className="space-y-4">
        <CreditDebitNotesWorkspace />
      </div>
    </PermissionGuard>
  );
}

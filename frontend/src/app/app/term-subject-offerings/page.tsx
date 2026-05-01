import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TermSubjectOfferingsWorkspace } from "@/features/term-subject-offerings/components/term-subject-offerings-workspace";

export default function TermSubjectOfferingsPage() {
  return (
    <PermissionGuard permission="term-subject-offerings.read">
      <div className="space-y-4">
        <TermSubjectOfferingsWorkspace />
      </div>
    </PermissionGuard>
  );
}






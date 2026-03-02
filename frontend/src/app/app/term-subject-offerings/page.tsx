import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { TermSubjectOfferingsWorkspace } from "@/features/term-subject-offerings/components/term-subject-offerings-workspace";

export default function TermSubjectOfferingsPage() {
  return (
    <PermissionGuard permission="term-subject-offerings.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 02 - Academic Core
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">عروض المواد للفصول</h2>
        </div>
        <TermSubjectOfferingsWorkspace />
      </div>
    </PermissionGuard>
  );
}





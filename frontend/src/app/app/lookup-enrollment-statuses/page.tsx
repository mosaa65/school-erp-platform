import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupEnrollmentStatusesWorkspace } from "@/features/lookup-enrollment-statuses/components/lookup-enrollment-statuses-workspace";

export default function LookupEnrollmentStatusesPage() {
  return (
    <PermissionGuard permission="lookup-enrollment-statuses.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">حالات القيد</h2>
        </div>
        <LookupEnrollmentStatusesWorkspace />
      </div>
    </PermissionGuard>
  );
}

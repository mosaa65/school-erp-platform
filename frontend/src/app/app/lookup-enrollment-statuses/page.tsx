import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupEnrollmentStatusesWorkspace } from "@/features/lookup-enrollment-statuses/components/lookup-enrollment-statuses-workspace";

export default function LookupEnrollmentStatusesPage() {
  return (
    <PermissionGuard permission="lookup-enrollment-statuses.read">
      <div className="space-y-4">
        <LookupEnrollmentStatusesWorkspace />
      </div>
    </PermissionGuard>
  );
}

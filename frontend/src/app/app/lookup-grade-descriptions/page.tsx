import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupGradeDescriptionsWorkspace } from "@/features/lookup-grade-descriptions/components/lookup-grade-descriptions-workspace";

export default function LookupGradeDescriptionsPage() {
  return (
    <PermissionGuard permission="lookup-grade-descriptions.read">
      <div className="space-y-4">
        <LookupGradeDescriptionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

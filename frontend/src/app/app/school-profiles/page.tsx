import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SchoolProfilesWorkspace } from "@/features/school-profiles/components/school-profiles-workspace";

export default function SchoolProfilesPage() {
  return (
    <PermissionGuard permission="school-profiles.read">
      <div className="space-y-4">
        <SchoolProfilesWorkspace />
      </div>
    </PermissionGuard>
  );
}





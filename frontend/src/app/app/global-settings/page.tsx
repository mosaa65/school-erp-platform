import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GlobalSettingsManagementWorkspace } from "@/features/global-settings/components/global-settings-management-workspace";

export default function GlobalSettingsPage() {
  return (
    <PermissionGuard permission="global-settings.read">
      <div className="space-y-4">
        <GlobalSettingsManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}






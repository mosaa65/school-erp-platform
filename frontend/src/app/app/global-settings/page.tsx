import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { GlobalSettingsManagementWorkspace } from "@/features/global-settings/components/global-settings-management-workspace";

export default function GlobalSettingsPage() {
  return (
    <PermissionGuard permission="global-settings.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            System 01 - Global Settings
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الإعدادات العامة</h2>
        </div>
        <GlobalSettingsManagementWorkspace />
      </div>
    </PermissionGuard>
  );
}





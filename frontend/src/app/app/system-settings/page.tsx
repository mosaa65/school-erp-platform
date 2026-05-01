import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SystemSettingsWorkspace } from "@/features/system-settings/components/system-settings-workspace";

export default function SystemSettingsPage() {
  return (
    <PermissionGuard permission="system-settings.read">
      <div className="space-y-4">
        <SystemSettingsWorkspace />
      </div>
    </PermissionGuard>
  );
}

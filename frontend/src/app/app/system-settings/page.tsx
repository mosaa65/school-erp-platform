import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SystemSettingsWorkspace } from "@/features/system-settings/components/system-settings-workspace";

export default function SystemSettingsPage() {
  return (
    <PermissionGuard permission="system-settings.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">إعدادات النظام</h2>
        </div>
        <SystemSettingsWorkspace />
      </div>
    </PermissionGuard>
  );
}

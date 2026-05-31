import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkSettingsWorkspace } from "@/features/assignments/homework-settings/components/homework-settings-workspace";

export default function HomeworkSettingsPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={[
        "homework-templates.read",
        "homework-types.read",
        "homework-settings.manage",
      ]}
    >
      <HomeworkSettingsWorkspace />
    </PermissionGuard>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { HomeworkRubricsWorkspace } from "@/features/assignments/homework-rubrics/components/homework-rubrics-workspace";

export default function HomeworkRubricsPage() {
  return (
    <PermissionGuard
      requiredAnyPermission={[
        "homework-rubrics.read",
        "homework-settings.manage",
        "homework-templates.read",
        "homework-types.read",
      ]}
    >
      <HomeworkRubricsWorkspace />
    </PermissionGuard>
  );
}

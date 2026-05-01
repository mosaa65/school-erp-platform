import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SectionsWorkspace } from "@/features/sections/components/sections-workspace";

export default function SectionsPage() {
  return (
    <PermissionGuard permission="sections.read">
      <div className="space-y-4">
        <SectionsWorkspace />
      </div>
    </PermissionGuard>
  );
}






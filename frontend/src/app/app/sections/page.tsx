import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SectionsWorkspace } from "@/features/sections/components/sections-workspace";

export default function SectionsPage() {
  return (
    <PermissionGuard permission="sections.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 02 - النواة الأكاديمية
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الشعب الدراسية</h2>
        </div>
        <SectionsWorkspace />
      </div>
    </PermissionGuard>
  );
}






import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AcademicMonthsWorkspace } from "@/features/academic-months/components/academic-months-workspace";

export default function AcademicMonthsPage() {
  return (
    <PermissionGuard permission="academic-months.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">الأشهر الأكاديمية</h2>
        </div>
        <AcademicMonthsWorkspace />
      </div>
    </PermissionGuard>
  );
}






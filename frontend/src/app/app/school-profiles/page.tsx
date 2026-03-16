import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { SchoolProfilesWorkspace } from "@/features/school-profiles/components/school-profiles-workspace";

export default function SchoolProfilesPage() {
  return (
    <PermissionGuard permission="school-profiles.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 01 - البنية المشتركة
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">ملف المدرسة</h2>
        </div>
        <SchoolProfilesWorkspace />
      </div>
    </PermissionGuard>
  );
}





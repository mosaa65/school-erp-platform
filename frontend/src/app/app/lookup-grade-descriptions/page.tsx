import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupGradeDescriptionsWorkspace } from "@/features/lookup-grade-descriptions/components/lookup-grade-descriptions-workspace";

export default function LookupGradeDescriptionsPage() {
  return (
    <PermissionGuard permission="lookup-grade-descriptions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">أوصاف التقديرات</h2>
        </div>
        <LookupGradeDescriptionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PromotionDecisionsWorkspace } from "@/features/promotion-decisions/components/promotion-decisions-workspace";

export default function PromotionDecisionsPage() {
  return (
    <PermissionGuard permission="promotion-decisions.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 05 - التعليم والدرجات
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">قرارات الترفيع</h2>
        </div>
        <PromotionDecisionsWorkspace />
      </div>
    </PermissionGuard>
  );
}






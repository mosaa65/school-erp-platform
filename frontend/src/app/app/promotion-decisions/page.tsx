import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { PromotionDecisionsWorkspace } from "@/features/promotion-decisions/components/promotion-decisions-workspace";

export default function PromotionDecisionsPage() {
  return (
    <PermissionGuard permission="promotion-decisions.read">
      <div className="space-y-4">
        <PromotionDecisionsWorkspace />
      </div>
    </PermissionGuard>
  );
}






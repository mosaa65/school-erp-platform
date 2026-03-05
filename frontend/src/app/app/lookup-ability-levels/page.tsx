import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupAbilityLevelsWorkspace } from "@/features/lookup-ability-levels/components/lookup-ability-levels-workspace";

export default function LookupAbilityLevelsPage() {
  return (
    <PermissionGuard permission="lookup-ability-levels.read">
      <div className="space-y-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            النظام 04 - الطلاب
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">مستويات القدرة</h2>
        </div>
        <LookupAbilityLevelsWorkspace />
      </div>
    </PermissionGuard>
  );
}

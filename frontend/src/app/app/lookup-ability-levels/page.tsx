import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { LookupAbilityLevelsWorkspace } from "@/features/lookup-ability-levels/components/lookup-ability-levels-workspace";

export default function LookupAbilityLevelsPage() {
  return (
    <PermissionGuard permission="lookup-ability-levels.read">
      <div className="space-y-4">
        <LookupAbilityLevelsWorkspace />
      </div>
    </PermissionGuard>
  );
}

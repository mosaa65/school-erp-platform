import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CommunityContributionsWorkspace } from "@/features/community-contributions/components/community-contributions-workspace";

export default function CommunityContributionsPage() {
  return (
    <PermissionGuard permission="community-contributions.read">
      <div className="space-y-4">
        <CommunityContributionsWorkspace />
      </div>
    </PermissionGuard>
  );
}

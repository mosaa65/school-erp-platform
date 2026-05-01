import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { UsersManagementWorkspace } from "@/features/users/components/users-management-workspace";

type UsersPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default function UsersPage({ searchParams }: UsersPageProps) {
  const initialSearchQuery =
    typeof searchParams?.q === "string" ? searchParams.q : "";

  return (
    <PermissionGuard permission="users.read">
      <div className="space-y-4">

        <UsersManagementWorkspace initialSearchQuery={initialSearchQuery} />
      </div>
    </PermissionGuard>
  );
}

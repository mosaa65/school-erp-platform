export type PermissionRequirement = {
  requiredPermission?: string;
  requiredAnyPermission?: string[];
};

type PermissionMatcher = {
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
};

export function matchesPermissionRequirement(
  requirement: PermissionRequirement,
  matcher: PermissionMatcher,
): boolean {
  const matchesSinglePermission =
    requirement.requiredPermission === undefined ||
    matcher.hasPermission(requirement.requiredPermission);
  const matchesAnyPermission =
    requirement.requiredAnyPermission === undefined ||
    matcher.hasAnyPermission(requirement.requiredAnyPermission);

  return matchesSinglePermission && matchesAnyPermission;
}

type BranchScopedWhere = Record<string, unknown>;

export function buildHybridBranchClause(
  branchId?: number | null,
  fieldName = 'branchId',
): BranchScopedWhere | undefined {
  if (branchId == null) {
    return undefined;
  }

  return {
    OR: [{ [fieldName]: branchId }, { [fieldName]: null }],
  };
}

export function combineWhereClauses<T extends BranchScopedWhere>(
  ...clauses: Array<T | undefined>
): T | { AND: T[] } {
  const defined = clauses.filter(
    (clause): clause is T => clause !== undefined,
  );

  if (defined.length === 0) {
    return {} as T;
  }

  if (defined.length === 1) {
    return defined[0];
  }

  return {
    AND: defined,
  };
}

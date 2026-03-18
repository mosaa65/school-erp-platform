"use client";

import * as React from "react";
import {
  Filter,
  LoaderCircle,
  MoveUpRight,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreatePromotionDecisionMutation,
  useDeletePromotionDecisionMutation,
  useUpdatePromotionDecisionMutation,
} from "@/features/promotion-decisions/hooks/use-promotion-decisions-mutations";
import { usePromotionDecisionsQuery } from "@/features/promotion-decisions/hooks/use-promotion-decisions-query";
import type { PromotionDecisionListItem } from "@/lib/api/client";

type FormState = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  code: "",
  name: "",
  description: "",
  isSystem: false,
  isActive: true,
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: PromotionDecisionListItem): FormState {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    isSystem: item.isSystem,
    isActive: item.isActive,
  };
}

export function PromotionDecisionsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("promotion-decisions.create");
  const canUpdate = hasPermission("promotion-decisions.update");
  const canDelete = hasPermission("promotion-decisions.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [systemFilter, setSystemFilter] = React.useState<"all" | "system" | "custom">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    system: "all" | "system" | "custom";
    active: "all" | "active" | "inactive";
  }>({
    system: "all",
    active: "all",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const promotionDecisionsQuery = usePromotionDecisionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isSystem: systemFilter === "all" ? undefined : systemFilter === "system",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreatePromotionDecisionMutation();
  const updateMutation = useUpdatePromotionDecisionMutation();
  const deleteMutation = useDeletePromotionDecisionMutation();

  const records = promotionDecisionsQuery.data?.data ?? [];
  const pagination = promotionDecisionsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, isEditing, records]);

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      system: systemFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, systemFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
    setActionSuccess(null);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: PromotionDecisionListItem) => {
    if (!canUpdate || item.isSystem) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(form.code);
    const name = form.name.trim();
    const description = form.description.trim();

    if (!code || !name) {
      setFormError("?????? ????????: ????? ??????.");
      return false;
    }
    if (code.length > 40 || !/^[A-Z0-9_]+$/.test(code)) {
      setFormError(
        "????? ??? ?? ????? ?????? ????? ???????? ????? ????? (_) ???? ???? ???? 40 ?????.",
      );
      return false;
    }
    if (name.length > 120) {
      setFormError("????? ??? ??? ?????? 120 ?????.");
      return false;
    }
    if (description.length > 255) {
      setFormError("????? ??? ??? ?????? 255 ?????.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      code: normalizeCode(form.code),
      name: form.name.trim(),
      description: toOptionalString(form.description),
      isSystem: form.isSystem,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("?? ???? ???????? ????????: promotion-decisions.update.");
        return;
      }

      updateMutation.mutate(
        {
          promotionDecisionId: editingId,
          payload,
        },
        {
          onSuccess: () => {
            resetFormState();
            setActionSuccess("?? ????? ???? ??????? ?????.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("?? ???? ???????? ????????: promotion-decisions.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
        setActionSuccess("?? ????? ???? ??????? ?????.");
      },
    });
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSystemFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setSystemFilter(filterDraft.system);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      systemFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, searchInput, systemFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="???..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="????? ?????? ???????"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex-1 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                ???
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
                ?????
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.system}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  system: event.target.value as "all" | "system" | "custom",
                }))
              }
            >
              <option value="all">????</option>
              <option value="system">?????</option>
              <option value="custom">????</option>
            </SelectField>

            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">?? ???????</option>
              <option value="active">???</option>
              <option value="inactive">??? ???</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>?????? ???????</CardTitle>
              <Badge variant="secondary">????????: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>????? ?????? ?????? ??????? ????????.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {promotionDecisionsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                ???? ????? ????????...
              </div>
            ) : null}
            {promotionDecisionsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {promotionDecisionsQuery.error instanceof Error
                  ? promotionDecisionsQuery.error.message
                  : "????? ????? ????????."}
              </div>
            ) : null}
            {!promotionDecisionsQuery.isPending && records.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                ?? ???? ?????.
              </div>
            ) : null}

            {records.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.name} (<code>{item.code}</code>)
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      ??? ??????? ??????? ????????: {item._count.annualResults}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.isSystem ? (
                      <Badge variant="outline" className="gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        ?????
                      </Badge>
                    ) : (
                      <Badge variant="secondary">????</Badge>
                    )}
                    <Badge variant={item.isActive ? "default" : "outline"}>
                      {item.isActive ? "???" : "??? ???"}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(item)}
                    disabled={!canUpdate || item.isSystem || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    ?????
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (!canDelete || item.isSystem) {
                        return;
                      }
                      if (!window.confirm(`????? ??? ?????? ${item.code}?`)) {
                        return;
                      }
                      deleteMutation.mutate(item.id, {
                        onSuccess: () => {
                          setActionSuccess("?? ??? ???? ??????? ?????.");
                        },
                      });
                    }}
                    disabled={!canDelete || item.isSystem || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ???
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                ?????? {pagination?.page ?? 1} ?? {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={
                    !pagination ||
                    pagination.page <= 1 ||
                    promotionDecisionsQuery.isFetching
                  }
                >
                  ??????
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) =>
                      pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                    )
                  }
                  disabled={
                    !pagination ||
                    pagination.page >= pagination.totalPages ||
                    promotionDecisionsQuery.isFetching
                  }
                >
                  ??????
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void promotionDecisionsQuery.refetch()}
                  disabled={promotionDecisionsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${promotionDecisionsQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  ?????
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="?????"
        ariaLabel="????? ???? ?????"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "????? ???? ?????" : "????? ???? ?????"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "??? ?????????" : "????? ???? ?????"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ?? ???? ???????? ????????: <code>promotion-decisions.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <Input
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="????? *"
              required
            />
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="????? *"
              required
            />
            <Input
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="?????"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>?????</span>
                <input
                  type="checkbox"
                  checked={form.isSystem}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isSystem: event.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>???</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              </label>
            </div>

            {formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {formError}
              </div>
            ) : null}
            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {mutationError}
              </div>
            ) : null}
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <MoveUpRight className="h-4 w-4" />
                )}
                {isEditing ? "??? ?????????" : "????? ???? ?????"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  ?????
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </BottomSheetForm>
    </>
  );
}

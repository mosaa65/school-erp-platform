"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Fab } from "@/components/ui/fab";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { useEntitySurface } from "@/hooks/use-entity-surface";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useUpdateSubjectMutation,
} from "@/features/subjects/hooks/use-subjects-mutations";
import { useSubjectsInfiniteQuery } from "@/features/subjects/hooks/use-subjects-query";
import {
  buildSubjectSurfacePreview,
  getSubjectCategoryLabel,
  subjectSurfaceDefinition,
} from "@/features/subjects/presentation/subject-surface-definition";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceContextMenu } from "@/presentation/entity-surface/entity-surface-context-menu";
import { EntitySurfaceGrid } from "@/presentation/entity-surface/entity-surface-grid";
import { EntitySurfaceHeaderActionButton } from "@/presentation/entity-surface/entity-surface-header-action-button";
import { getEntitySurfaceDefinition } from "@/presentation/entity-surface/entity-surface-registry";
import {
  EntitySurfaceRecordSelectable,
  EntitySurfaceRecords,
} from "@/presentation/entity-surface/entity-surface-records";
import { EntitySurfaceRow } from "@/presentation/entity-surface/entity-surface-row";
import type {
  EntitySurfaceQuickAction,
  EntitySurfaceViewMode,
} from "@/presentation/entity-surface/entity-surface-types";
import type { SubjectCategory, SubjectListItem } from "@/lib/api/client";

type SubjectFormState = {
  code: string;
  name: string;
  shortName: string;
  category: SubjectCategory;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS: SubjectCategory[] = [
  "CORE",
  "ELECTIVE",
  "LANGUAGE",
  "SCIENCE",
  "MATHEMATICS",
  "HUMANITIES",
  "ARTS",
  "SPORTS",
  "TECHNOLOGY",
  "OTHER",
];

const DEFAULT_FORM_STATE: SubjectFormState = {
  code: "",
  name: "",
  shortName: "",
  category: "CORE",
  isActive: true,
};


function toFormState(subject: SubjectListItem): SubjectFormState {
  return {
    code: subject.code,
    name: subject.name,
    shortName: subject.shortName ?? "",
    category: subject.category,
    isActive: subject.isActive,
  };
}

function resolveSubjectViewMode(
  requestedMode: EntitySurfaceViewMode,
  allowedViewModes: EntitySurfaceViewMode[] | undefined,
  fallbackMode: EntitySurfaceViewMode,
): EntitySurfaceViewMode {
  if (!allowedViewModes || allowedViewModes.includes(requestedMode)) {
    return requestedMode;
  }

  return allowedViewModes[0] ?? fallbackMode;
}

export function SubjectsWorkspace() {
  const { hasPermission } = useRbac();
  const entitySurface = useEntitySurface();
  const subjectsSurface = React.useMemo(
    () => getEntitySurfaceDefinition<SubjectListItem>("subjects") ?? subjectSurfaceDefinition,
    [],
  );
  const canCreate = hasPermission("subjects.create");
  const canUpdate = hasPermission("subjects.update");
  const canDelete = hasPermission("subjects.delete");
  const canUseQuickActions = canUpdate || canDelete;

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<SubjectCategory | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    category: SubjectCategory | "all";
    active: "all" | "active" | "inactive";
  }>({
    category: "all",
    active: "all",
  });

  const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<SubjectFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [contextSubjectId, setContextSubjectId] = React.useState<string | null>(null);

  const subjectsQuery = useSubjectsInfiniteQuery({
    limit: PAGE_SIZE,
    search: search || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateSubjectMutation();
  const updateMutation = useUpdateSubjectMutation();
  const deleteMutation = useDeleteSubjectMutation();

  const isEditing = editingSubjectId !== null;
  const subjects = React.useMemo(
    () => subjectsQuery.data?.pages.flatMap((pageData) => pageData.data) ?? [],
    [subjectsQuery.data?.pages],
  );
  const pagination = subjectsQuery.data?.pages.at(-1)?.pagination;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = subjects.some((subject) => subject.id === editingSubjectId);
    if (!stillExists) {
      setEditingSubjectId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingSubjectId, isEditing, subjects]);

  useDebounceEffect(() => {
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      category: categoryFilter,
      active: activeFilter,
    });
  }, [activeFilter, categoryFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingSubjectId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingSubjectId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!name) {
      setFormError("الحقول الأساسية مطلوبة: الاسم.");
      return false;
    }

    if (name.length > 120) {
      setFormError("الاسم يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.shortName.trim().length > 50) {
      setFormError("الاسم المختصر يجب ألا يتجاوز 50 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      shortName: formState.shortName.trim() || undefined,
      category: formState.category,
      isActive: formState.isActive,
    };

    if (isEditing && editingSubjectId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: subjects.update.");
        return;
      }

      updateMutation.mutate(
        {
          subjectId: editingSubjectId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث المادة بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: subjects.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setActionSuccess("تم إنشاء المادة بنجاح.");
      },
    });
  };

  const handleStartEdit = (subject: SubjectListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingSubjectId(subject.id);
    setFormState(toFormState(subject));
    setIsFormOpen(true);
  };

  const handleDelete = (subject: SubjectListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف المادة ${subject.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(subject.id, {
      onSuccess: () => {
        if (editingSubjectId === subject.id) {
          resetForm();
        }
        setContextSubjectId(null);
        setActionSuccess("تم حذف المادة بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategoryFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setCategoryFilter(filterDraft.category);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, categoryFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [activeFilter, categoryFilter, searchInput]);

  const contextSubject = React.useMemo(
    () => subjects.find((subject) => subject.id === contextSubjectId) ?? null,
    [contextSubjectId, subjects],
  );
  const resolvedViewMode = resolveSubjectViewMode(
    entitySurface.defaultViewMode,
    subjectsSurface.allowedViewModes,
    subjectsSurface.defaultViewMode ?? "smart-card",
  );

  const buildSubjectQuickActions = (subject: SubjectListItem): EntitySurfaceQuickAction[] => {
    if (!canUseQuickActions) {
      return [];
    }

    const actions: EntitySurfaceQuickAction[] = [];

    if (canUpdate) {
      actions.push({
        key: "edit",
        label: "تعديل",
        icon: <PencilLine className="h-4 w-4" />,
        tone: "accent",
        disabled: updateMutation.isPending,
        onClick: () => {
          setContextSubjectId(null);
          handleStartEdit(subject);
        },
      });
    }

    if (canDelete) {
      actions.push({
        key: "delete",
        label: "حذف",
        icon: <Trash2 className="h-4 w-4" />,
        tone: "danger",
        disabled: deleteMutation.isPending,
        onClick: () => {
          setContextSubjectId(null);
          handleDelete(subject);
        },
      });
    }

    return actions;
  };

  const renderSubjectHeaderActions = (subject: SubjectListItem) => (
    <div className="flex items-center gap-1">
      {canUpdate ? (
        <EntitySurfaceHeaderActionButton
          label="تعديل"
          icon={<PencilLine className="h-3.5 w-3.5" />}
          tone="edit"
          colorMode={entitySurface.colorMode}
          entityKey="subjects"
          onClick={() => handleStartEdit(subject)}
          disabled={updateMutation.isPending}
        />
      ) : null}

      {canDelete ? (
        <EntitySurfaceHeaderActionButton
          label="حذف"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          tone="delete"
          colorMode={entitySurface.colorMode}
          entityKey="subjects"
          onClick={() => handleDelete(subject)}
          disabled={deleteMutation.isPending}
        />
      ) : null}
    </div>
  );

  const contextSubjectQuickActions = contextSubject ? buildSubjectQuickActions(contextSubject) : [];

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالاسم أو الاختصار..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        {actionSuccess ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {actionSuccess}
          </div>
        ) : null}

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المواد"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="التصنيف">
              <SelectField
                icon={<BookOpenText />}
                value={filterDraft.category}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    category: event.target.value as SubjectCategory | "all",
                  }))
                }
              >
                <option value="all">كل التصنيفات</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {getSubjectCategoryLabel(category)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="الحالة">
              <SelectField
                icon={<BookOpenText />}
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as "all" | "active" | "inactive",
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                <option value="active">النشطة فقط</option>
                <option value="inactive">غير النشطة فقط</option>
              </SelectField>
            </FormField>
          </div>
        </FilterDrawer>

        <EntitySurfaceRecords
          title="قائمة المواد"
          description="إدارة المواد عبر بطاقات موحدة وتحميل تلقائي عند النزول."
          total={pagination?.total ?? 0}
          loaded={subjects.length}
          isInitialLoading={subjectsQuery.isPending}
          isFetching={subjectsQuery.isFetching}
          isFetchingMore={subjectsQuery.isFetchingNextPage}
          hasMore={subjectsQuery.hasNextPage}
          error={subjectsQuery.error}
          emptyTitle="لا توجد مواد مطابقة."
          onRefresh={() => void subjectsQuery.refetch()}
          onLoadMore={() => void subjectsQuery.fetchNextPage()}
          recordIds={subjects.map((subject) => subject.id)}
          selectionLabel="مادة"
        >
          {subjects.length > 0 ? (
            <EntitySurfaceGrid
              viewMode={resolvedViewMode}
              density={entitySurface.density}
              richness={entitySurface.richness}
              colorMode={entitySurface.colorMode}
              visualStyle={entitySurface.visualStyle}
              effectsPreset={entitySurface.effectsPreset}
              shapePreset={entitySurface.shapePreset}
              entityKey="subjects"
              inlineActionsMode={entitySurface.inlineActionsMode}
            >
              {subjects.map((subject) => {
                const preview =
                  subjectsSurface.buildPreview?.(subject) ?? buildSubjectSurfacePreview(subject);
                const headerActions = renderSubjectHeaderActions(subject);
                const contextQuickActions = buildSubjectQuickActions(subject);
                const canOpenContext =
                  entitySurface.longPressMode !== "disabled" && contextQuickActions.length > 0;

                if (resolvedViewMode === "dense-row") {
                    return (
                      <EntitySurfaceRecordSelectable key={subject.id} id={subject.id}>
                        <EntitySurfaceRow
                        title={preview.title}
                        avatar={preview.avatar}
                        headerActions={headerActions}
                        density={entitySurface.density}
                        richness={entitySurface.richness}
                      colorMode={entitySurface.colorMode}
                      visualStyle={entitySurface.visualStyle}
                      effectsPreset={entitySurface.effectsPreset}
                      shapePreset={entitySurface.shapePreset}
                      entityKey="subjects"
                      inlineActionsMode={entitySurface.inlineActionsMode}
                      motionPreset={entitySurface.motionPreset}
                      reducedMotion={entitySurface.reducedMotion}
                      longPressMode={entitySurface.longPressMode}
                      avatarMode={entitySurface.avatarMode}
                      contextOpen={contextSubjectId === subject.id}
                      onLongPress={() => {
                        if (!canOpenContext) {
                          return;
                        }
                        setContextSubjectId(subject.id);
                      }}
                    />
                      </EntitySurfaceRecordSelectable>
                  );
                }

                return (
                  <EntitySurfaceRecordSelectable key={subject.id} id={subject.id}>
                    <EntitySurfaceCard
                    title={preview.title}
                    avatar={preview.avatar}
                    headerActions={headerActions}
                    viewMode={resolvedViewMode}
                    density={entitySurface.density}
                    richness={entitySurface.richness}
                    colorMode={entitySurface.colorMode}
                    visualStyle={entitySurface.visualStyle}
                    effectsPreset={entitySurface.effectsPreset}
                    shapePreset={entitySurface.shapePreset}
                    entityKey="subjects"
                    inlineActionsMode={entitySurface.inlineActionsMode}
                    motionPreset={entitySurface.motionPreset}
                    reducedMotion={entitySurface.reducedMotion}
                    longPressMode={entitySurface.longPressMode}
                    avatarMode={entitySurface.avatarMode}
                    contextOpen={contextSubjectId === subject.id}
                    onLongPress={() => {
                      if (!canOpenContext) {
                        return;
                      }
                      setContextSubjectId(subject.id);
                    }}
                  />
                  </EntitySurfaceRecordSelectable>
                );
              })}
            </EntitySurfaceGrid>
          ) : null}
        </EntitySurfaceRecords>
      </div>

      {contextSubject ? (
        <EntitySurfaceContextMenu
          open
          card={{
            title: contextSubject.name,
            avatar: buildSubjectSurfacePreview(contextSubject).avatar,
            viewMode: resolvedViewMode,
            density: entitySurface.density,
            richness: entitySurface.richness,
            colorMode: entitySurface.colorMode,
            visualStyle: entitySurface.visualStyle,
            effectsPreset: entitySurface.effectsPreset,
            shapePreset: entitySurface.shapePreset,
            entityKey: "subjects",
            inlineActionsMode: entitySurface.inlineActionsMode,
            motionPreset: entitySurface.motionPreset,
            reducedMotion: entitySurface.reducedMotion,
            longPressMode: entitySurface.longPressMode,
            avatarMode: entitySurface.avatarMode,
          }}
          actions={contextSubjectQuickActions}
          copyText={`${contextSubject.name} ${contextSubject.code ?? ""}`.trim()}
          onClose={() => setContextSubjectId(null)}
        />
      ) : null}

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إنشاء"
        ariaLabel="إنشاء مادة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مادة" : "إنشاء مادة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء مادة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>subjects.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="الاسم" required>
              <Input
                icon={<Type />}
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الرياضيات"
                required
              />
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="الاسم المختصر">
                <Input
                  icon={<Type />}
                  value={formState.shortName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, shortName: event.target.value }))
                  }
                  placeholder="MATH"
                />
              </FormField>

              <FormField label="التصنيف" required>
                <SelectField
                  icon={<BookOpenText />}
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      category: event.target.value as SubjectCategory,
                    }))
                  }
                  required
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {getSubjectCategoryLabel(category)}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <FormBooleanField
              label="نشط"
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, isActive: checked }))
              }
            />

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

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpenText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء مادة"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </BottomSheetForm>
    </>
  );
}

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Lock, LockOpen, PencilLine, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ApiError,
  apiClient,
  type AssessmentComponentEntryMode,
  type AssessmentPeriodCategory,
  type AssessmentPeriodComponentListItem,
  type AssessmentPeriodListItem,
  type CreateAssessmentComponentSourcePeriodPayload,
  type CreateAssessmentPeriodComponentPayload,
  type CreateAssessmentPeriodPayload,
} from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

type AssessmentPeriodsWorkspaceProps = {
  allowedCategories?: AssessmentPeriodCategory[];
  fixedWorkspaceView?: "overview" | "components" | "sources";
  hideWorkspaceSwitcher?: boolean;
  componentEntryModes?: AssessmentComponentEntryMode[];
  searchPlaceholder?: string;
  actions?: {
    createPeriod?: boolean;
    createComponent?: boolean;
    createSource?: boolean;
  };
  labels?: {
    workflowTitle?: string;
    contextTitle?: string;
    periodsTitle?: string;
    componentsTitle?: string;
    sourcesTitle?: string;
  };
  visiblePanels?: {
    components?: boolean;
    sources?: boolean;
  };
};

type PeriodFormState = {
  academicYearId: string;
  academicTermId: string;
  academicMonthId: string;
  category: AssessmentPeriodCategory;
  name: string;
  sequence: string;
  maxScore: string;
};

type ComponentFormState = {
  assessmentPeriodId: string;
  name: string;
  code: string;
  entryMode: AssessmentComponentEntryMode;
  maxScore: string;
  sortOrder: string;
};

const DEFAULT_PERIOD_FORM: PeriodFormState = {
  academicYearId: "",
  academicTermId: "",
  academicMonthId: "",
  category: "MONTHLY",
  name: "",
  sequence: "1",
  maxScore: "100",
};

const DEFAULT_COMPONENT_FORM: ComponentFormState = {
  assessmentPeriodId: "",
  name: "",
  code: "",
  entryMode: "MANUAL",
  maxScore: "0",
  sortOrder: "1",
};

function toOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function categoryLabel(value: AssessmentPeriodCategory) {
  if (value === "MONTHLY") return "شهرية";
  if (value === "SEMESTER") return "فصلية";
  return "نهائية";
}

function sourceCategoryForPeriod(value: AssessmentPeriodCategory): AssessmentPeriodCategory | null {
  if (value === "SEMESTER") return "MONTHLY";
  if (value === "YEAR_FINAL") return "SEMESTER";
  return null;
}

function entryModeLabel(value: AssessmentComponentEntryMode) {
  if (value === "MANUAL") return "يدوي";
  if (value === "AUTO_ATTENDANCE") return "حضور";
  if (value === "AUTO_HOMEWORK") return "واجبات";
  if (value === "AUTO_EXAM") return "اختبار";
  return "محصلة";
}

function formatPeriodScope(item: AssessmentPeriodListItem) {
  const parts = [formatNameCodeLabel(item.academicYear.name, item.academicYear.code)];
  if (item.academicTerm) {
    parts.push(formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code));
  }
  if (item.academicMonth) {
    parts.push(formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code));
  }
  return parts.join(" / ");
}

function formatSourceScope(
  item: Pick<
    AssessmentPeriodListItem,
    "academicYear" | "academicTerm" | "academicMonth"
  >,
) {
  const parts = [formatNameCodeLabel(item.academicYear.name, item.academicYear.code)];
  if (item.academicTerm) {
    parts.push(formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code));
  }
  if (item.academicMonth) {
    parts.push(formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code));
  }
  return parts.join(" / ");
}

export function AssessmentPeriodsWorkspace({
  allowedCategories,
  fixedWorkspaceView,
  hideWorkspaceSwitcher = false,
  componentEntryModes,
  searchPlaceholder = "ابحث باسم الفترة...",
  actions,
  labels,
  visiblePanels,
}: AssessmentPeriodsWorkspaceProps = {}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();

  const canCreatePeriod = hasPermission("assessment-periods.create");
  const canUpdatePeriod = hasPermission("assessment-periods.update");
  const canDeletePeriod = hasPermission("assessment-periods.delete");
  const canLockPeriod = hasPermission("assessment-periods.lock");
  const canUnlockPeriod = hasPermission("assessment-periods.unlock");
  const canCreateComponent = hasPermission("assessment-period-components.create");
  const canUpdateComponent = hasPermission("assessment-period-components.update");
  const canDeleteComponent = hasPermission("assessment-period-components.delete");
  const canCreateSource = hasPermission("assessment-component-source-periods.create");
  const canDeleteSource = hasPermission("assessment-component-source-periods.delete");
  const allowCreatePeriodAction = actions?.createPeriod ?? true;
  const allowCreateComponentAction = actions?.createComponent ?? true;
  const allowCreateSourceAction = actions?.createSource ?? true;
  const categoryOptions = allowedCategories ?? ["MONTHLY", "SEMESTER", "YEAR_FINAL"];

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [lockedFilter, setLockedFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<{
    year: string;
    locked: "all" | "locked" | "unlocked";
  }>({
    year: "all",
    locked: "all",
  });
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = React.useState<string | null>(null);
  const [periodForm, setPeriodForm] = React.useState(DEFAULT_PERIOD_FORM);
  const [componentForm, setComponentForm] = React.useState(DEFAULT_COMPONENT_FORM);
  const [sourcePeriodId, setSourcePeriodId] = React.useState("");
  const [editingPeriod, setEditingPeriod] = React.useState<AssessmentPeriodListItem | null>(null);
  const [editingComponent, setEditingComponent] = React.useState<AssessmentPeriodComponentListItem | null>(null);
  const [periodSheetOpen, setPeriodSheetOpen] = React.useState(false);
  const [componentSheetOpen, setComponentSheetOpen] = React.useState(false);
  const [sourceSheetOpen, setSourceSheetOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = React.useState<"overview" | "components" | "sources">(
    fixedWorkspaceView ?? "overview",
  );

  const onAuthError = React.useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
    [auth],
  );

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["assessment-periods"] });
    void queryClient.invalidateQueries({ queryKey: ["assessment-period-components"] });
    void queryClient.invalidateQueries({ queryKey: ["assessment-component-source-periods"] });
  }, [queryClient]);

  const yearsQuery = useQuery({
    queryKey: ["academic-years", "options", "assessment-periods"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => (await apiClient.listAcademicYears({ page: 1, limit: 100 })).data,
  });

  const termsQuery = useQuery({
    queryKey: ["academic-terms", "options", periodForm.academicYearId],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () =>
      (
        await apiClient.listAcademicTerms({
          page: 1,
          limit: 100,
          academicYearId: periodForm.academicYearId || undefined,
          isActive: true,
        })
      ).data,
  });

  const monthsQuery = useQuery({
    queryKey: ["academic-months", "options", periodForm.academicYearId],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () =>
      (
        await apiClient.listAcademicMonths({
          page: 1,
          limit: 100,
          academicYearId: periodForm.academicYearId || undefined,
          isActive: true,
        })
      ).data,
  });

  const periodsQuery = useQuery({
    queryKey: ["assessment-periods", "list", search],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () =>
      apiClient.listAssessmentPeriods({
        page: 1,
        limit: 100,
        search: search || undefined,
        isActive: true,
      }),
  });

  const componentsQuery = useQuery({
    queryKey: ["assessment-period-components", selectedPeriodId],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(selectedPeriodId),
    queryFn: async () =>
      apiClient.listAssessmentPeriodComponents({
        page: 1,
        limit: 100,
        assessmentPeriodId: selectedPeriodId ?? undefined,
        isActive: true,
      }),
  });

  const sourceLinksQuery = useQuery({
    queryKey: ["assessment-component-source-periods", selectedComponentId],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(selectedComponentId),
    queryFn: async () =>
      apiClient.listAssessmentComponentSourcePeriods({
        page: 1,
        limit: 100,
        assessmentPeriodComponentId: selectedComponentId ?? undefined,
        isActive: true,
      }),
  });

  const createPeriodMutation = useMutation({
    mutationFn: (payload: CreateAssessmentPeriodPayload) => apiClient.createAssessmentPeriod(payload),
    onSuccess: () => {
      invalidate();
      setPeriodSheetOpen(false);
      setMessage("تم حفظ الفترة.");
    },
    onError: onAuthError,
  });

  const updatePeriodMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateAssessmentPeriodPayload }) =>
      apiClient.updateAssessmentPeriod(params.id, params.payload),
    onSuccess: () => {
      invalidate();
      setPeriodSheetOpen(false);
      setMessage("تم تحديث الفترة.");
    },
    onError: onAuthError,
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAssessmentPeriod(id),
    onSuccess: () => {
      invalidate();
      setSelectedPeriodId(null);
      setSelectedComponentId(null);
      setMessage("تم حذف الفترة.");
    },
    onError: onAuthError,
  });

  const lockPeriodMutation = useMutation({
    mutationFn: (id: string) => apiClient.lockAssessmentPeriod(id),
    onSuccess: () => {
      invalidate();
      setMessage("تم قفل الفترة واعتمادها.");
    },
    onError: onAuthError,
  });

  const unlockPeriodMutation = useMutation({
    mutationFn: (id: string) => apiClient.unlockAssessmentPeriod(id),
    onSuccess: () => {
      invalidate();
      setMessage("تم فك قفل الفترة.");
    },
    onError: onAuthError,
  });

  const createComponentMutation = useMutation({
    mutationFn: (payload: CreateAssessmentPeriodComponentPayload) =>
      apiClient.createAssessmentPeriodComponent(payload),
    onSuccess: () => {
      invalidate();
      setComponentSheetOpen(false);
      setMessage("تم حفظ المكوّن.");
    },
    onError: onAuthError,
  });

  const updateComponentMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateAssessmentPeriodComponentPayload }) =>
      apiClient.updateAssessmentPeriodComponent(params.id, params.payload),
    onSuccess: () => {
      invalidate();
      setComponentSheetOpen(false);
      setMessage("تم تحديث المكوّن.");
    },
    onError: onAuthError,
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAssessmentPeriodComponent(id),
    onSuccess: () => {
      invalidate();
      setSelectedComponentId(null);
      setMessage("تم حذف المكوّن.");
    },
    onError: onAuthError,
  });

  const createSourceMutation = useMutation({
    mutationFn: (payload: CreateAssessmentComponentSourcePeriodPayload) =>
      apiClient.createAssessmentComponentSourcePeriod(payload),
    onSuccess: () => {
      invalidate();
      setSourceSheetOpen(false);
      setSourcePeriodId("");
      setMessage("تم حفظ الربط.");
    },
    onError: onAuthError,
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAssessmentComponentSourcePeriod(id),
    onSuccess: () => {
      invalidate();
      setMessage("تم حذف الربط.");
    },
    onError: onAuthError,
  });

  const periods = React.useMemo(
    () => {
      const allPeriods = periodsQuery.data?.data ?? [];
      return allowedCategories && allowedCategories.length > 0
        ? allPeriods.filter((item) => allowedCategories.includes(item.category))
        : allPeriods;
    },
    [periodsQuery.data?.data, allowedCategories],
  );
  const components = React.useMemo(() => {
    const items = componentsQuery.data?.data ?? [];
    if (!componentEntryModes || componentEntryModes.length === 0) {
      return items;
    }
    return items.filter((item) => componentEntryModes.includes(item.entryMode));
  }, [componentEntryModes, componentsQuery.data?.data]);
  const sourceLinks = sourceLinksQuery.data?.data ?? [];
  const selectedPeriod = periods.find((item) => item.id === selectedPeriodId) ?? null;
  const selectedComponent = components.find((item) => item.id === selectedComponentId) ?? null;
  const selectedPeriodComponentsTotal = components.reduce((sum, item) => sum + item.maxScore, 0);
  const sourceCategory = selectedPeriod ? sourceCategoryForPeriod(selectedPeriod.category) : null;
  const availableSourcePeriods = periods.filter((item) => {
    if (!selectedPeriod || !sourceCategory || item.id === selectedPeriod.id || item.category !== sourceCategory) {
      return false;
    }

    if (item.academicYearId !== selectedPeriod.academicYearId) {
      return false;
    }

    if (selectedPeriod.academicTermId && item.academicTermId !== selectedPeriod.academicTermId) {
      return false;
    }

    return !sourceLinks.some((link) => link.sourcePeriodId === item.id);
  });

  const showComponentsPanel = visiblePanels?.components ?? true;
  const showSourcesPanel = visiblePanels?.sources ?? true;
  const filteredPeriods = React.useMemo(
    () =>
      periods.filter((item) => {
        if (yearFilter !== "all" && item.academicYearId !== yearFilter) {
          return false;
        }
        if (lockedFilter === "locked" && !item.isLocked) {
          return false;
        }
        if (lockedFilter === "unlocked" && item.isLocked) {
          return false;
        }
        return true;
      }),
    [lockedFilter, periods, yearFilter],
  );

  useDebounceEffect(() => {
    setSearch(searchInput.trim());
  }, 350, [searchInput]);

  React.useEffect(() => {
    if (fixedWorkspaceView) {
      setWorkspaceView(fixedWorkspaceView);
    }
  }, [fixedWorkspaceView]);

  React.useEffect(() => {
    if (selectedPeriodId && !filteredPeriods.some((item) => item.id === selectedPeriodId)) {
      setSelectedPeriodId(filteredPeriods[0]?.id ?? null);
      return;
    }
    if (!selectedPeriodId && filteredPeriods[0]) {
      setSelectedPeriodId(filteredPeriods[0].id);
    }
  }, [filteredPeriods, selectedPeriodId]);

  React.useEffect(() => {
    if (!selectedPeriodId) {
      setSelectedComponentId(null);
      return;
    }
    if (!components.find((item) => item.id === selectedComponentId)) {
      setSelectedComponentId(components[0]?.id ?? null);
    }
  }, [components, selectedComponentId, selectedPeriodId]);

  const mutationError =
    (createPeriodMutation.error as Error | null)?.message ??
    (updatePeriodMutation.error as Error | null)?.message ??
    (deletePeriodMutation.error as Error | null)?.message ??
    (lockPeriodMutation.error as Error | null)?.message ??
    (unlockPeriodMutation.error as Error | null)?.message ??
    (createComponentMutation.error as Error | null)?.message ??
    (updateComponentMutation.error as Error | null)?.message ??
    (deleteComponentMutation.error as Error | null)?.message ??
    (createSourceMutation.error as Error | null)?.message ??
    (deleteSourceMutation.error as Error | null)?.message ??
    null;
  const lockedPeriodsCount = filteredPeriods.filter((item) => item.isLocked).length;
  const aggregatedComponentsCount = components.filter(
    (item) => item.entryMode === "AGGREGATED_PERIODS",
  ).length;
  const activeFiltersCount = React.useMemo(
    () =>
      [searchInput.trim() ? 1 : 0, yearFilter !== "all" ? 1 : 0, lockedFilter !== "all" ? 1 : 0].reduce(
        (sum, value) => sum + value,
        0,
      ),
    [lockedFilter, searchInput, yearFilter],
  );

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setLockedFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setYearFilter(filterDraft.year);
    setLockedFilter(filterDraft.locked);
    setIsFilterOpen(false);
  };

  const openCreatePeriod = () => {
    setEditingPeriod(null);
    setPeriodForm({
      ...DEFAULT_PERIOD_FORM,
      category: categoryOptions[0] ?? "MONTHLY",
    });
    setPeriodSheetOpen(true);
  };

  const openEditPeriod = (item: AssessmentPeriodListItem) => {
    setEditingPeriod(item);
    setPeriodForm({
      academicYearId: item.academicYearId,
      academicTermId: item.academicTermId ?? "",
      academicMonthId: item.academicMonthId ?? "",
      category: item.category,
      name: item.name,
      sequence: String(item.sequence),
      maxScore: String(item.maxScore),
    });
    setPeriodSheetOpen(true);
  };

  const openCreateComponent = () => {
    if (!selectedPeriodId) return;
    setEditingComponent(null);
    setComponentForm({ ...DEFAULT_COMPONENT_FORM, assessmentPeriodId: selectedPeriodId });
    setComponentSheetOpen(true);
  };

  const openEditComponent = (item: AssessmentPeriodComponentListItem) => {
    setEditingComponent(item);
    setComponentForm({
      assessmentPeriodId: item.assessmentPeriodId,
      name: item.name,
      code: item.code ?? "",
      entryMode: item.entryMode,
      maxScore: String(item.maxScore),
      sortOrder: String(item.sortOrder),
    });
    setComponentSheetOpen(true);
  };

  const submitPeriod = () => {
    if (!periodForm.academicYearId || !periodForm.name.trim()) {
      setMessage("السنة واسم الفترة مطلوبان.");
      return;
    }
    const payload: CreateAssessmentPeriodPayload = {
      academicYearId: periodForm.academicYearId,
      category: periodForm.category,
      academicTermId: periodForm.category === "YEAR_FINAL" ? undefined : toOptionalString(periodForm.academicTermId),
      academicMonthId: periodForm.category === "MONTHLY" ? toOptionalString(periodForm.academicMonthId) : undefined,
      name: periodForm.name.trim(),
      sequence: toOptionalNumber(periodForm.sequence),
      maxScore: toOptionalNumber(periodForm.maxScore),
      status: "DRAFT",
      isActive: true,
    };
    if (editingPeriod) {
      updatePeriodMutation.mutate({ id: editingPeriod.id, payload });
    } else {
      createPeriodMutation.mutate(payload);
    }
  };

  const submitComponent = () => {
    if (!componentForm.assessmentPeriodId || !componentForm.name.trim()) {
      setMessage("اختر الفترة واكتب اسم المكوّن.");
      return;
    }
    const payload: CreateAssessmentPeriodComponentPayload = {
      assessmentPeriodId: componentForm.assessmentPeriodId,
      name: componentForm.name.trim(),
      code: toOptionalString(componentForm.code),
      entryMode: componentForm.entryMode,
      maxScore: toOptionalNumber(componentForm.maxScore),
      sortOrder: toOptionalNumber(componentForm.sortOrder),
      isRequired: true,
      isActive: true,
    };
    if (editingComponent) {
      updateComponentMutation.mutate({ id: editingComponent.id, payload });
    } else {
      createComponentMutation.mutate(payload);
    }
  };

  const submitSource = () => {
    if (!selectedComponentId || !sourcePeriodId) {
      setMessage("اختر فترة مصدر.");
      return;
    }
    createSourceMutation.mutate({
      assessmentPeriodComponentId: selectedComponentId,
      sourcePeriodId,
      isActive: true,
    });
  };

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder={searchPlaceholder}
          filterCount={activeFiltersCount}
          onFilterClick={() => {
            setFilterDraft({
              year: yearFilter,
              locked: lockedFilter,
            });
            setIsFilterOpen(true);
          }}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الفترات"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              value={filterDraft.year}
              onChange={(event) => setFilterDraft((prev) => ({ ...prev, year: event.target.value }))}
            >
              <option value="all">كل السنوات</option>
              {(yearsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.locked}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  locked: event.target.value as "all" | "locked" | "unlocked",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="locked">المقفلة فقط</option>
              <option value="unlocked">غير المقفلة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">{labels?.workflowTitle ?? "سير العمل"}</CardTitle>
            {!hideWorkspaceSwitcher ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={workspaceView === "overview" ? "default" : "outline"}
                onClick={() => setWorkspaceView("overview")}
              >
                نظرة عامة
              </Button>
              <Button
                type="button"
                variant={workspaceView === "components" ? "default" : "outline"}
                onClick={() => setWorkspaceView("components")}
              >
                المكوّنات
              </Button>
              <Button
                type="button"
                variant={workspaceView === "sources" ? "default" : "outline"}
                onClick={() => setWorkspaceView("sources")}
                disabled={selectedComponent?.entryMode !== "AGGREGATED_PERIODS"}
              >
                فترات المحصلة
              </Button>
            </div>
            ) : null}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels?.contextTitle ?? "البحث والسياق"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">عدد الفترات</p>
                <p className="mt-1 font-semibold">{filteredPeriods.length}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">الفترات المقفلة</p>
                <p className="mt-1 font-semibold">{lockedPeriodsCount}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">الفترة المختارة</p>
                <p className="mt-1 font-semibold">{selectedPeriod?.name ?? "لم يتم التحديد"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">مكوّنات المحصلة</p>
                <p className="mt-1 font-semibold">{aggregatedComponentsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(message || mutationError) ? (
          <Card>
            <CardContent className="p-4 text-sm">
              {message ? <p>{message}</p> : null}
              {mutationError ? <p className="text-rose-700">{mutationError}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{labels?.periodsTitle ?? "سجلات الفترات"}</CardTitle>
              {canCreatePeriod && allowCreatePeriodAction ? (
                <Button size="sm" onClick={openCreatePeriod}>
                  <Plus className="h-4 w-4" />
                  إضافة
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredPeriods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPeriodId(item.id)}
                  className={`w-full rounded-xl border p-3 text-right ${
                    selectedPeriodId === item.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.name}</p>
                        <Badge variant="secondary">{categoryLabel(item.category)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPeriodScope(item)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        المجموع {item.maxScore} | المكوّنات {item._count.components}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {canUpdatePeriod ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditPeriod(item);
                          }}
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDeletePeriod ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePeriodMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {item.isLocked ? (
                        canUnlockPeriod ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              unlockPeriodMutation.mutate(item.id);
                            }}
                          >
                            <LockOpen className="h-4 w-4" />
                          </Button>
                        ) : null
                      ) : canLockPeriod ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            lockPeriodMutation.mutate(item.id);
                          }}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {showComponentsPanel ? (
          workspaceView !== "sources" ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{labels?.componentsTitle ?? "سجلات المكوّنات"}</CardTitle>
              {canCreateComponent && allowCreateComponentAction ? (
                <Button size="sm" onClick={openCreateComponent} disabled={!selectedPeriodId}>
                  <Plus className="h-4 w-4" />
                  إضافة
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPeriod ? (
                <div className="space-y-1 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  <p>الفترة المختارة: {selectedPeriod.name}</p>
                  <p>إجمالي المكونات: {selectedPeriodComponentsTotal} من {selectedPeriod.maxScore}</p>
                  {selectedPeriodComponentsTotal !== selectedPeriod.maxScore ? (
                    <p className="text-amber-700">
                      مجموع المكوّنات لا يساوي مجموع الفترة بعد.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {components.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedComponentId(item.id)}
                  className={`w-full rounded-xl border p-3 text-right ${
                    selectedComponentId === item.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entryModeLabel(item.entryMode)} | الدرجة {item.maxScore}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {canUpdateComponent ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditComponent(item);
                          }}
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDeleteComponent ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteComponentMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المكوّنات</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                انتقل إلى عرض &quot;المكوّنات&quot; لمراجعة وتعديل مكوّنات الفترة.
              </CardContent>
            </Card>
          )
          ) : null}

          {showSourcesPanel ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                {labels?.sourcesTitle ?? "سجلات الربط"}
              </CardTitle>
              {canCreateSource && allowCreateSourceAction ? (
                <Button
                  size="sm"
                  onClick={() => setSourceSheetOpen(true)}
                  disabled={selectedComponent?.entryMode !== "AGGREGATED_PERIODS"}
                >
                  <Plus className="h-4 w-4" />
                  ربط
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {sourceLinks.map((item) => (
                <div key={item.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.sourcePeriod.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSourceScope(
                          periods.find((period) => period.id === item.sourcePeriod.id) ?? {
                            academicYear: selectedPeriod?.academicYear ?? {
                              id: "",
                              code: "",
                              name: "-",
                              status: "ACTIVE",
                              isCurrent: false,
                            },
                            academicTerm:
                              periods.find((period) => period.id === item.sourcePeriod.id)?.academicTerm ?? null,
                            academicMonth:
                              periods.find((period) => period.id === item.sourcePeriod.id)?.academicMonth ?? null,
                          },
                        )}
                      </p>
                    </div>
                    {canDeleteSource ? (
                      <Button size="icon" variant="ghost" onClick={() => deleteSourceMutation.mutate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {selectedComponent?.entryMode !== "AGGREGATED_PERIODS" ? (
                <p className="text-sm text-muted-foreground">اختر مكوّنًا من نوع محصلة.</p>
              ) : null}
              {selectedComponent?.entryMode === "AGGREGATED_PERIODS" && sourceLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  اربط الفترات {sourceCategory === "MONTHLY" ? "الشهرية" : "الفصلية"} من نفس السنة والترم لتدخل في المحصلة.
                </p>
              ) : null}
            </CardContent>
          </Card>
          ) : null}
        </div>
      </div>

      <BottomSheetForm
        open={periodSheetOpen}
        title={editingPeriod ? "تعديل فترة" : "إضافة فترة"}
        onClose={() => setPeriodSheetOpen(false)}
        onSubmit={submitPeriod}
        submitLabel={editingPeriod ? "حفظ" : "إنشاء"}
        showCancelButton
        isSubmitting={createPeriodMutation.isPending || updatePeriodMutation.isPending}
      >
        <div className="grid gap-3">
          <SelectField
            value={periodForm.category}
            disabled={categoryOptions.length === 1}
            onChange={(event) =>
              setPeriodForm((prev) => ({
                ...prev,
                category: event.target.value as AssessmentPeriodCategory,
              }))
            }
          >
            {categoryOptions.includes("MONTHLY") ? <option value="MONTHLY">شهرية</option> : null}
            {categoryOptions.includes("SEMESTER") ? <option value="SEMESTER">فصلية</option> : null}
            {categoryOptions.includes("YEAR_FINAL") ? <option value="YEAR_FINAL">نهائية</option> : null}
          </SelectField>
          <SelectField
            value={periodForm.academicYearId}
            onChange={(event) => setPeriodForm((prev) => ({ ...prev, academicYearId: event.target.value }))}
          >
            <option value="">اختر السنة</option>
            {(yearsQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {formatNameCodeLabel(item.name, item.code)}
              </option>
            ))}
          </SelectField>
          {periodForm.category !== "YEAR_FINAL" ? (
            <SelectField
              value={periodForm.academicTermId}
              onChange={(event) => setPeriodForm((prev) => ({ ...prev, academicTermId: event.target.value }))}
            >
              <option value="">اختر الترم</option>
              {(termsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
          ) : null}
          {periodForm.category === "MONTHLY" ? (
            <SelectField
              value={periodForm.academicMonthId}
              onChange={(event) => setPeriodForm((prev) => ({ ...prev, academicMonthId: event.target.value }))}
            >
              <option value="">اختر الشهر</option>
              {(monthsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
          ) : null}
          <Input value={periodForm.name} onChange={(event) => setPeriodForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="اسم الفترة" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="number" value={periodForm.sequence} onChange={(event) => setPeriodForm((prev) => ({ ...prev, sequence: event.target.value }))} placeholder="الترتيب" />
            <Input type="number" value={periodForm.maxScore} onChange={(event) => setPeriodForm((prev) => ({ ...prev, maxScore: event.target.value }))} placeholder="المجموع" />
          </div>
        </div>
      </BottomSheetForm>

      <BottomSheetForm
        open={componentSheetOpen}
        title={editingComponent ? "تعديل مكوّن" : "إضافة مكوّن"}
        onClose={() => setComponentSheetOpen(false)}
        onSubmit={submitComponent}
        submitLabel={editingComponent ? "حفظ" : "إنشاء"}
        showCancelButton
        isSubmitting={createComponentMutation.isPending || updateComponentMutation.isPending}
      >
        <div className="grid gap-3">
          <Input value={componentForm.name} onChange={(event) => setComponentForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="اسم المكوّن" />
          <Input value={componentForm.code} onChange={(event) => setComponentForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="رمز اختياري" />
          <SelectField
            value={componentForm.entryMode}
            onChange={(event) =>
              setComponentForm((prev) => ({
                ...prev,
                entryMode: event.target.value as AssessmentComponentEntryMode,
              }))
            }
          >
            <option value="MANUAL">يدوي</option>
            <option value="AUTO_ATTENDANCE">تلقائي من الحضور</option>
            <option value="AUTO_HOMEWORK">تلقائي من الواجبات</option>
            <option value="AUTO_EXAM">تلقائي من الاختبار</option>
            <option value="AGGREGATED_PERIODS">محصلة فترات</option>
          </SelectField>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="number" value={componentForm.maxScore} onChange={(event) => setComponentForm((prev) => ({ ...prev, maxScore: event.target.value }))} placeholder="الدرجة" />
            <Input type="number" value={componentForm.sortOrder} onChange={(event) => setComponentForm((prev) => ({ ...prev, sortOrder: event.target.value }))} placeholder="الترتيب" />
          </div>
        </div>
      </BottomSheetForm>

      <BottomSheetForm
        open={sourceSheetOpen}
        title="ربط فترة مصدر"
        onClose={() => setSourceSheetOpen(false)}
        onSubmit={submitSource}
        submitLabel="حفظ"
        showCancelButton
        isSubmitting={createSourceMutation.isPending}
      >
        <SelectField value={sourcePeriodId} onChange={(event) => setSourcePeriodId(event.target.value)}>
          <option value="">
            {sourceCategory === "SEMESTER" ? "اختر فترة فصلية" : "اختر فترة شهرية"}
          </option>
          {availableSourcePeriods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {formatPeriodScope(item)}
              </option>
          ))}
        </SelectField>
      </BottomSheetForm>
    </>
  );
}

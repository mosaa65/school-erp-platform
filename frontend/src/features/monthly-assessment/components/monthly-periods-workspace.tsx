"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CalendarDays, Layers3, Lock, LockOpen, PencilLine, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  apiClient,
  type AssessmentComponentEntryMode,
  type AssessmentPeriodComponentListItem,
  type AssessmentPeriodListItem,
  type CreateAssessmentPeriodComponentPayload,
  type CreateAssessmentPeriodPayload,
} from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

type MonthlyPeriodsWorkspaceMode = "periods" | "components" | "links";

type MonthlyPeriodsWorkspaceProps = {
  mode: MonthlyPeriodsWorkspaceMode;
};

type PeriodFormState = {
  academicYearId: string;
  academicTermId: string;
  academicMonthId: string;
  name: string;
  sequence: string;
  maxScore: string;
  isActive: boolean;
};

type ComponentFormState = {
  assessmentPeriodId: string;
  name: string;
  code: string;
  entryMode: AssessmentComponentEntryMode;
  maxScore: string;
  sortOrder: string;
  isRequired: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_PERIOD_FORM: PeriodFormState = {
  academicYearId: "",
  academicTermId: "",
  academicMonthId: "",
  name: "",
  sequence: "1",
  maxScore: "100",
  isActive: true,
};

const DEFAULT_COMPONENT_FORM: ComponentFormState = {
  assessmentPeriodId: "",
  name: "",
  code: "",
  entryMode: "MANUAL",
  maxScore: "0",
  sortOrder: "1",
  isRequired: true,
  isActive: true,
};

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function periodScopeLabel(item: AssessmentPeriodListItem) {
  const parts = [formatNameCodeLabel(item.academicYear.name, item.academicYear.code)];
  if (item.academicTerm) {
    parts.push(formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code));
  }
  if (item.academicMonth) {
    parts.push(formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code));
  }
  return parts.join(" / ");
}

function entryModeLabel(mode: AssessmentComponentEntryMode) {
  switch (mode) {
    case "MANUAL":
      return "يدوي";
    case "AUTO_ATTENDANCE":
      return "الحضور والغياب";
    case "AUTO_HOMEWORK":
      return "الواجبات";
    case "AUTO_EXAM":
      return "الاختبارات";
    case "AGGREGATED_PERIODS":
      return "محصلة";
  }
}

function entryModeBadgeVariant(mode: AssessmentComponentEntryMode): "default" | "secondary" | "outline" {
  if (mode === "MANUAL") return "outline";
  if (mode === "AGGREGATED_PERIODS") return "default";
  return "secondary";
}

export function MonthlyPeriodsWorkspace({ mode }: MonthlyPeriodsWorkspaceProps) {
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

  const isPeriodsMode = mode === "periods";
  const isLinksMode = mode === "links";

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [entryModeFilter, setEntryModeFilter] = React.useState<"all" | AssessmentComponentEntryMode>(
    isLinksMode ? "AUTO_HOMEWORK" : "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [lockedFilter, setLockedFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState({
    year: "all",
    term: "all",
    month: "all",
    period: "all",
    entryMode: (isLinksMode ? "AUTO_HOMEWORK" : "all") as "all" | AssessmentComponentEntryMode,
    active: "all" as "all" | "active" | "inactive",
    locked: "all" as "all" | "locked" | "unlocked",
  });
  const [editingPeriod, setEditingPeriod] = React.useState<AssessmentPeriodListItem | null>(null);
  const [editingComponent, setEditingComponent] = React.useState<AssessmentPeriodComponentListItem | null>(null);
  const [periodForm, setPeriodForm] = React.useState(DEFAULT_PERIOD_FORM);
  const [componentForm, setComponentForm] = React.useState(DEFAULT_COMPONENT_FORM);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const formAcademicYearId =
    isPeriodsMode && isFormOpen && periodForm.academicYearId ? periodForm.academicYearId : yearFilter;

  const yearsQuery = useQuery({
    queryKey: ["monthly-assessment-years"],
    queryFn: async () => (await apiClient.listAcademicYears({ page: 1, limit: 100 })).data,
  });

  const termsQuery = useQuery({
    queryKey: ["monthly-assessment-terms", formAcademicYearId],
    queryFn: async () =>
      (
        await apiClient.listAcademicTerms({
          page: 1,
          limit: 100,
          academicYearId: formAcademicYearId === "all" ? undefined : formAcademicYearId,
          isActive: true,
        })
      ).data,
  });

  const monthsQuery = useQuery({
    queryKey: ["monthly-assessment-months", formAcademicYearId],
    queryFn: async () =>
      (
        await apiClient.listAcademicMonths({
          page: 1,
          limit: 100,
          academicYearId: formAcademicYearId === "all" ? undefined : formAcademicYearId,
          isActive: true,
        })
      ).data,
  });

  const periodsQuery = useQuery({
    queryKey: [
      "monthly-assessment-periods",
      page,
      search,
      yearFilter,
      termFilter,
      monthFilter,
      activeFilter,
      lockedFilter,
    ],
    queryFn: async () =>
      apiClient.listMonthlyAssessmentPeriods({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        academicYearId: yearFilter === "all" ? undefined : yearFilter,
        academicTermId: termFilter === "all" ? undefined : termFilter,
        academicMonthId: monthFilter === "all" ? undefined : monthFilter,
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
        isLocked: lockedFilter === "all" ? undefined : lockedFilter === "locked",
      }),
  });

  const componentsQuery = useQuery({
    queryKey: ["monthly-assessment-components", page, search, periodFilter, entryModeFilter, activeFilter],
    enabled: !isPeriodsMode,
    queryFn: async () =>
      apiClient.listMonthlyAssessmentComponents({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        assessmentPeriodId: periodFilter === "all" ? undefined : periodFilter,
        entryMode: entryModeFilter === "all" ? undefined : entryModeFilter,
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      }),
  });

  const periods = periodsQuery.data?.data ?? [];
  const periodsPagination = periodsQuery.data?.pagination;
  const allMonthlyPeriodsQuery = useQuery({
    queryKey: ["monthly-assessment-periods-options"],
    queryFn: async () =>
      (
        await apiClient.listMonthlyAssessmentPeriods({
          page: 1,
          limit: 200,
          isActive: true,
        })
      ).data,
  });
  const monthlyPeriods = allMonthlyPeriodsQuery.data ?? [];
  const components = React.useMemo(() => {
    const items = componentsQuery.data?.data ?? [];
    if (!isLinksMode) {
      return items;
    }
    return items.filter((item) =>
      ["MANUAL", "AUTO_HOMEWORK", "AUTO_ATTENDANCE", "AUTO_EXAM"].includes(item.entryMode),
    );
  }, [componentsQuery.data?.data, isLinksMode]);
  const componentsPagination = componentsQuery.data?.pagination;

  const createPeriodMutation = useMutation({
    mutationFn: (payload: CreateAssessmentPeriodPayload) => apiClient.createMonthlyAssessmentPeriod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods-options"] });
      setActionSuccess("تم إنشاء الفترة الشهرية.");
      handleCloseForm();
    },
  });

  const updatePeriodMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateAssessmentPeriodPayload }) =>
      apiClient.updateMonthlyAssessmentPeriod(params.id, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods-options"] });
      setActionSuccess("تم تحديث الفترة الشهرية.");
      handleCloseForm();
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteMonthlyAssessmentPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods-options"] });
      setActionSuccess("تم حذف الفترة الشهرية.");
    },
  });

  const lockPeriodMutation = useMutation({
    mutationFn: (id: string) => apiClient.lockMonthlyAssessmentPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods"] });
      setActionSuccess("تم اعتماد الفترة الشهرية.");
    },
  });

  const unlockPeriodMutation = useMutation({
    mutationFn: (id: string) => apiClient.unlockMonthlyAssessmentPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-periods"] });
      setActionSuccess("تم فك اعتماد الفترة الشهرية.");
    },
  });

  const createComponentMutation = useMutation({
    mutationFn: (payload: CreateAssessmentPeriodComponentPayload) =>
      apiClient.createMonthlyAssessmentComponent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-components"] });
      setActionSuccess("تم إنشاء مكوّن الفترة الشهرية.");
      handleCloseForm();
    },
  });

  const updateComponentMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateAssessmentPeriodComponentPayload }) =>
      apiClient.updateMonthlyAssessmentComponent(params.id, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-components"] });
      setActionSuccess("تم تحديث مكوّن الفترة الشهرية.");
      handleCloseForm();
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteMonthlyAssessmentComponent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-assessment-components"] });
      setActionSuccess("تم حذف مكوّن الفترة الشهرية.");
    },
  });

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [yearFilter, termFilter, monthFilter, periodFilter, entryModeFilter, activeFilter, lockedFilter]);

  React.useEffect(() => {
    if (!isPeriodsMode) {
      return;
    }

    setPeriodForm((prev) => {
      const nextTermId =
        prev.academicTermId && (termsQuery.data ?? []).some((item) => item.id === prev.academicTermId)
          ? prev.academicTermId
          : "";
      const nextMonthId =
        prev.academicMonthId && (monthsQuery.data ?? []).some((item) => item.id === prev.academicMonthId)
          ? prev.academicMonthId
          : "";

      if (nextTermId === prev.academicTermId && nextMonthId === prev.academicMonthId) {
        return prev;
      }

      return {
        ...prev,
        academicTermId: nextTermId,
        academicMonthId: nextMonthId,
      };
    });
  }, [isPeriodsMode, termsQuery.data, monthsQuery.data]);

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingPeriod(null);
    setEditingComponent(null);
    setPeriodForm(DEFAULT_PERIOD_FORM);
    setComponentForm(DEFAULT_COMPONENT_FORM);
    setFormError(null);
  }

  function openCreate() {
    setActionSuccess(null);
    setFormError(null);
    setEditingPeriod(null);
    setEditingComponent(null);
    if (isPeriodsMode) {
      setPeriodForm(DEFAULT_PERIOD_FORM);
    } else {
      setComponentForm({
        ...DEFAULT_COMPONENT_FORM,
        entryMode: isLinksMode ? "AUTO_HOMEWORK" : "MANUAL",
        assessmentPeriodId: periodFilter === "all" ? "" : periodFilter,
      });
    }
    setIsFormOpen(true);
  }

  function openEditPeriod(item: AssessmentPeriodListItem) {
    setEditingPeriod(item);
    setEditingComponent(null);
    setFormError(null);
    setPeriodForm({
      academicYearId: item.academicYearId,
      academicTermId: item.academicTermId ?? "",
      academicMonthId: item.academicMonthId ?? "",
      name: item.name,
      sequence: String(item.sequence),
      maxScore: String(item.maxScore),
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  }

  function openEditComponent(item: AssessmentPeriodComponentListItem) {
    setEditingComponent(item);
    setEditingPeriod(null);
    setFormError(null);
    setComponentForm({
      assessmentPeriodId: item.assessmentPeriodId,
      name: item.name,
      code: item.code ?? "",
      entryMode: item.entryMode,
      maxScore: String(item.maxScore),
      sortOrder: String(item.sortOrder),
      isRequired: item.isRequired,
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  }

  function handleSubmit() {
    setActionSuccess(null);

    if (isPeriodsMode) {
      if (!periodForm.academicYearId || !periodForm.academicTermId || !periodForm.academicMonthId || !periodForm.name.trim()) {
        setFormError("السنة والترم والشهر واسم الفترة الشهرية مطلوبة.");
        return;
      }

      const payload: CreateAssessmentPeriodPayload = {
        academicYearId: periodForm.academicYearId,
        academicTermId: periodForm.academicTermId,
        academicMonthId: periodForm.academicMonthId,
        category: "MONTHLY",
        name: periodForm.name.trim(),
        sequence: toOptionalNumber(periodForm.sequence),
        maxScore: toOptionalNumber(periodForm.maxScore),
        status: "DRAFT",
        isActive: periodForm.isActive,
      };

      if (editingPeriod) {
        updatePeriodMutation.mutate({ id: editingPeriod.id, payload });
      } else {
        createPeriodMutation.mutate(payload);
      }
      return;
    }

    if (!componentForm.assessmentPeriodId || !componentForm.name.trim()) {
      setFormError("الفترة الشهرية واسم المكوّن مطلوبان.");
      return;
    }

    const payload: CreateAssessmentPeriodComponentPayload = {
      assessmentPeriodId: componentForm.assessmentPeriodId,
      name: componentForm.name.trim(),
      code: componentForm.code.trim() || undefined,
      entryMode: componentForm.entryMode,
      maxScore: toOptionalNumber(componentForm.maxScore),
      sortOrder: toOptionalNumber(componentForm.sortOrder),
      isRequired: componentForm.isRequired,
      isActive: componentForm.isActive,
    };

    if (editingComponent) {
      updateComponentMutation.mutate({ id: editingComponent.id, payload });
    } else {
      createComponentMutation.mutate(payload);
    }
  }

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTermFilter("all");
    setMonthFilter("all");
    setPeriodFilter("all");
    setEntryModeFilter(isLinksMode ? "AUTO_HOMEWORK" : "all");
    setActiveFilter("all");
    setLockedFilter("all");
    setIsFilterOpen(false);
    setPage(1);
  };

  const applyFilters = () => {
    setYearFilter(filterDraft.year);
    setTermFilter(filterDraft.term);
    setMonthFilter(filterDraft.month);
    setPeriodFilter(filterDraft.period);
    setEntryModeFilter(filterDraft.entryMode);
    setActiveFilter(filterDraft.active);
    setLockedFilter(filterDraft.locked);
    setIsFilterOpen(false);
    setPage(1);
  };

  const activeFiltersCount = [
    searchInput.trim() ? 1 : 0,
    yearFilter !== "all" ? 1 : 0,
    termFilter !== "all" ? 1 : 0,
    monthFilter !== "all" ? 1 : 0,
    periodFilter !== "all" ? 1 : 0,
    entryModeFilter !== "all" ? 1 : 0,
    activeFilter !== "all" ? 1 : 0,
    lockedFilter !== "all" ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const title =
    mode === "periods"
      ? "سجلات الفترات الشهرية"
      : mode === "components"
        ? "سجلات مكونات الفترات الشهرية"
        : "سجلات ربط مكونات الشهر";

  const description =
    mode === "periods"
      ? "إدارة الفترات الشهرية بسجلات موحدة وبحث وفلاتر ونموذج إضافة مستقل."
      : mode === "components"
        ? "إدارة مكونات الفترات الشهرية وربطها بكل فترة شهرية بشكل مستقل."
        : "إدارة مكونات الشهر المرتبطة بأنظمة الواجبات والحضور والاختبارات والإدخال اليدوي.";

  const total = isPeriodsMode ? periodsPagination?.total ?? 0 : componentsPagination?.total ?? 0;
  const isSubmitting =
    createPeriodMutation.isPending ||
    updatePeriodMutation.isPending ||
    createComponentMutation.isPending ||
    updateComponentMutation.isPending;
  const mutationError =
    (createPeriodMutation.error as Error | null)?.message ??
    (updatePeriodMutation.error as Error | null)?.message ??
    (deletePeriodMutation.error as Error | null)?.message ??
    (lockPeriodMutation.error as Error | null)?.message ??
    (unlockPeriodMutation.error as Error | null)?.message ??
    (createComponentMutation.error as Error | null)?.message ??
    (updateComponentMutation.error as Error | null)?.message ??
    (deleteComponentMutation.error as Error | null)?.message ??
    null;

  return (
    <>
      <div className="space-y-4">
        {actionSuccess ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            {actionSuccess}
          </div>
        ) : null}

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder={
            isPeriodsMode ? "ابحث باسم الفترة الشهرية..." : "ابحث باسم المكوّن الشهري..."
          }
          filterCount={activeFiltersCount}
          onFilterClick={() => {
            setFilterDraft({
              year: yearFilter,
              term: termFilter,
              month: monthFilter,
              period: periodFilter,
              entryMode: entryModeFilter,
              active: activeFilter,
              locked: lockedFilter,
            });
            setIsFilterOpen(true);
          }}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>السنة الدراسية</Label>
              <SelectField value={filterDraft.year} onChange={(event) => setFilterDraft((prev) => ({ ...prev, year: event.target.value }))} icon={<CalendarDays className="h-4 w-4" />}>
                <option value="all">كل السنوات</option>
                {(yearsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1">
              <Label>الفصل الدراسي</Label>
              <SelectField value={filterDraft.term} onChange={(event) => setFilterDraft((prev) => ({ ...prev, term: event.target.value }))}>
                <option value="all">كل الفصول</option>
                {(termsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1">
              <Label>الشهر الأكاديمي</Label>
              <SelectField value={filterDraft.month} onChange={(event) => setFilterDraft((prev) => ({ ...prev, month: event.target.value }))}>
                <option value="all">كل الأشهر</option>
                {(monthsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </div>
            {!isPeriodsMode ? (
              <div className="space-y-1">
                <Label>الفترة الشهرية</Label>
                <SelectField value={filterDraft.period} onChange={(event) => setFilterDraft((prev) => ({ ...prev, period: event.target.value }))}>
                  <option value="all">كل الفترات الشهرية</option>
                  {monthlyPeriods.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </SelectField>
              </div>
            ) : null}
            {isPeriodsMode ? (
              <div className="space-y-1">
                <Label>حالة الاعتماد</Label>
                <SelectField value={filterDraft.locked} onChange={(event) => setFilterDraft((prev) => ({ ...prev, locked: event.target.value as "all" | "locked" | "unlocked" }))} icon={<Layers3 className="h-4 w-4" />}>
                  <option value="all">كل الحالات</option>
                  <option value="locked">المعتمدة فقط</option>
                  <option value="unlocked">غير المعتمدة فقط</option>
                </SelectField>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>نوع الربط</Label>
                <SelectField value={filterDraft.entryMode} onChange={(event) => setFilterDraft((prev) => ({ ...prev, entryMode: event.target.value as "all" | AssessmentComponentEntryMode }))} icon={<Layers3 className="h-4 w-4" />}>
                  {!isLinksMode ? <option value="all">كل الأنواع</option> : null}
                  <option value="MANUAL">يدوي</option>
                  <option value="AUTO_ATTENDANCE">الحضور والغياب</option>
                  <option value="AUTO_HOMEWORK">الواجبات</option>
                  <option value="AUTO_EXAM">الاختبارات</option>
                </SelectField>
              </div>
            )}
            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField value={filterDraft.active} onChange={(event) => setFilterDraft((prev) => ({ ...prev, active: event.target.value as "all" | "active" | "inactive" }))} icon={<Activity className="h-4 w-4" />}>
                <option value="all">كل الحالات</option>
                <option value="active">النشطة فقط</option>
                <option value="inactive">غير النشطة فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{title}</CardTitle>
              <Badge variant="secondary">الإجمالي: {total}</Badge>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {mutationError}
              </div>
            ) : null}

            {isPeriodsMode && periodsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل الفترات الشهرية...</div>
            ) : null}

            {!isPeriodsMode && componentsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل مكونات الشهر...</div>
            ) : null}

            {isPeriodsMode && !periodsQuery.isPending && periods.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد فترات شهرية مطابقة.</div>
            ) : null}

            {!isPeriodsMode && !componentsQuery.isPending && components.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد مكونات شهرية مطابقة.</div>
            ) : null}

            {isPeriodsMode
              ? periods.map((item) => (
                  <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{periodScopeLabel(item)}</p>
                        <p className="text-xs text-muted-foreground">الترتيب: {item.sequence} | الدرجة الكلية: {item.maxScore}</p>
                        <p className="text-xs text-muted-foreground">المكونات: {item._count.components} | النتائج: {item._count.results}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">شهري</Badge>
                        <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                        <Badge variant={item.isLocked ? "default" : "secondary"}>{item.isLocked ? "معتمد" : "مسودة"}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditPeriod(item)} disabled={!canUpdatePeriod}>
                        <PencilLine className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      {item.isLocked ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => unlockPeriodMutation.mutate(item.id)} disabled={!canUnlockPeriod || unlockPeriodMutation.isPending}>
                          <LockOpen className="h-3.5 w-3.5" />
                          فك الاعتماد
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => lockPeriodMutation.mutate(item.id)} disabled={!canLockPeriod || lockPeriodMutation.isPending}>
                          <Lock className="h-3.5 w-3.5" />
                          اعتماد
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => deletePeriodMutation.mutate(item.id)} disabled={!canDeletePeriod || deletePeriodMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))
              : components.map((item) => (
                  <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          الفترة: {monthlyPeriods.find((period) => period.id === item.assessmentPeriodId)?.name ?? item.assessmentPeriod.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          الدرجة: {item.maxScore} | الترتيب: {item.sortOrder} {item.code ? `| الرمز: ${item.code}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={entryModeBadgeVariant(item.entryMode)}>{entryModeLabel(item.entryMode)}</Badge>
                        <Badge variant={item.isRequired ? "default" : "outline"}>{item.isRequired ? "إلزامي" : "اختياري"}</Badge>
                        <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditComponent(item)} disabled={!canUpdateComponent}>
                        <PencilLine className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => deleteComponentMutation.mutate(item.id)} disabled={!canDeleteComponent || deleteComponentMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                الصفحة {(isPeriodsMode ? periodsPagination?.page : componentsPagination?.page) ?? 1} من {(isPeriodsMode ? periodsPagination?.totalPages : componentsPagination?.totalPages) ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1}>
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(prev + 1, (isPeriodsMode ? periodsPagination?.totalPages : componentsPagination?.totalPages) ?? prev),
                    )
                  }
                  disabled={page >= ((isPeriodsMode ? periodsPagination?.totalPages : componentsPagination?.totalPages) ?? 1)}
                >
                  التالي
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void (isPeriodsMode ? periodsQuery.refetch() : componentsQuery.refetch())}>
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        onClick={openCreate}
        ariaLabel={isPeriodsMode ? "إنشاء فترة شهرية" : "إنشاء مكوّن شهري"}
        disabled={isPeriodsMode ? !canCreatePeriod : !canCreateComponent}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={
          isPeriodsMode
            ? editingPeriod
              ? "تعديل فترة شهرية"
              : "إنشاء فترة شهرية"
            : editingComponent
              ? "تعديل مكوّن شهري"
              : "إنشاء مكوّن شهري"
        }
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        submitLabel={editingPeriod || editingComponent ? "حفظ التعديلات" : "إنشاء"}
        isSubmitting={isSubmitting}
        showCancelButton
      >
        {isPeriodsMode ? (
          <div className="space-y-3">
            <FormField label="السنة الدراسية" required error={!periodForm.academicYearId && formError ? formError : undefined}>
              <SelectField value={periodForm.academicYearId} onChange={(event) => setPeriodForm((prev) => ({ ...prev, academicYearId: event.target.value }))}>
                <option value="">اختر السنة الدراسية</option>
                {(yearsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="الفصل الدراسي" required>
              <SelectField value={periodForm.academicTermId} onChange={(event) => setPeriodForm((prev) => ({ ...prev, academicTermId: event.target.value }))}>
                <option value="">اختر الفصل الدراسي</option>
                {(termsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="الشهر الأكاديمي" required>
              <SelectField value={periodForm.academicMonthId} onChange={(event) => setPeriodForm((prev) => ({ ...prev, academicMonthId: event.target.value }))}>
                <option value="">اختر الشهر الأكاديمي</option>
                {(monthsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="اسم الفترة الشهرية" required>
              <Input value={periodForm.name} onChange={(event) => setPeriodForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="مثال: نتيجة شهر محرم" />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="الترتيب">
                <Input type="number" value={periodForm.sequence} onChange={(event) => setPeriodForm((prev) => ({ ...prev, sequence: event.target.value }))} />
              </FormField>
              <FormField label="الدرجة الكلية">
                <Input type="number" value={periodForm.maxScore} onChange={(event) => setPeriodForm((prev) => ({ ...prev, maxScore: event.target.value }))} />
              </FormField>
            </div>
            <FormBooleanField label="الحالة النشطة" checked={periodForm.isActive} onCheckedChange={(checked) => setPeriodForm((prev) => ({ ...prev, isActive: checked }))} />
            {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <FormField label="الفترة الشهرية" required>
              <SelectField value={componentForm.assessmentPeriodId} onChange={(event) => setComponentForm((prev) => ({ ...prev, assessmentPeriodId: event.target.value }))}>
                <option value="">اختر الفترة الشهرية</option>
                {monthlyPeriods.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="اسم المكوّن" required>
              <Input value={componentForm.name} onChange={(event) => setComponentForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="مثال: الواجبات" />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="الرمز">
                <Input value={componentForm.code} onChange={(event) => setComponentForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="HW" />
              </FormField>
              <FormField label="نوع الربط">
                <SelectField value={componentForm.entryMode} onChange={(event) => setComponentForm((prev) => ({ ...prev, entryMode: event.target.value as AssessmentComponentEntryMode }))}>
                  {!isLinksMode ? <option value="MANUAL">يدوي</option> : null}
                  <option value="AUTO_ATTENDANCE">الحضور والغياب</option>
                  <option value="AUTO_HOMEWORK">الواجبات</option>
                  <option value="AUTO_EXAM">الاختبارات</option>
                  {!isLinksMode ? <option value="AGGREGATED_PERIODS">محصلة</option> : null}
                  {isLinksMode ? <option value="MANUAL">يدوي</option> : null}
                </SelectField>
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="درجة المكوّن">
                <Input type="number" value={componentForm.maxScore} onChange={(event) => setComponentForm((prev) => ({ ...prev, maxScore: event.target.value }))} />
              </FormField>
              <FormField label="الترتيب">
                <Input type="number" value={componentForm.sortOrder} onChange={(event) => setComponentForm((prev) => ({ ...prev, sortOrder: event.target.value }))} />
              </FormField>
            </div>
            <FormBooleanField label="مكوّن إلزامي" checked={componentForm.isRequired} onCheckedChange={(checked) => setComponentForm((prev) => ({ ...prev, isRequired: checked }))} />
            <FormBooleanField label="الحالة النشطة" checked={componentForm.isActive} onCheckedChange={(checked) => setComponentForm((prev) => ({ ...prev, isActive: checked }))} />
            {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div> : null}
          </div>
        )}
      </BottomSheetForm>
    </>
  );
}

"use client";

import * as React from "react";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  LoaderCircle,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  Layers,
  Settings2,
  AlertCircle,
  TrendingDown,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAcademicYearOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/results-decisions/annual-results/hooks/use-grade-level-options-query";
import { usePromotionDecisionOptionsQuery } from "@/features/results-decisions/annual-results/hooks/use-promotion-decision-options-query";
import {
  useCreateGradingOutcomeRuleMutation,
  useDeleteGradingOutcomeRuleMutation,
  useUpdateGradingOutcomeRuleMutation,
} from "@/features/evaluation-policies/grading-outcome-rules/hooks/use-grading-outcome-rules-mutations";
import { useGradingOutcomeRulesQuery } from "@/features/evaluation-policies/grading-outcome-rules/hooks/use-grading-outcome-rules-query";
import { translateTieBreakStrategy } from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type { GradingOutcomeRuleListItem, TieBreakStrategy } from "@/lib/api/client";

type FormState = {
  academicYearId: string;
  gradeLevelId: string;
  promotedMaxFailedSubjects: string;
  conditionalMaxFailedSubjects: string;
  conditionalDecisionId: string;
  retainedDecisionId: string;
  tieBreakStrategy: TieBreakStrategy;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  gradeLevelId: "",
  promotedMaxFailedSubjects: "0",
  conditionalMaxFailedSubjects: "2",
  conditionalDecisionId: "",
  retainedDecisionId: "",
  tieBreakStrategy: "PERCENTAGE_THEN_NAME",
  isActive: true,
};

function parseIntValue(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toFormState(item: GradingOutcomeRuleListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId,
    promotedMaxFailedSubjects: String(item.promotedMaxFailedSubjects),
    conditionalMaxFailedSubjects: String(item.conditionalMaxFailedSubjects),
    conditionalDecisionId: item.conditionalDecisionId,
    retainedDecisionId: item.retainedDecisionId,
    tieBreakStrategy: item.tieBreakStrategy,
    isActive: item.isActive,
  };
}

export function GradingOutcomeRulesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grading-outcome-rules.create");
  const canUpdate = hasPermission("grading-outcome-rules.update");
  const canDelete = hasPermission("grading-outcome-rules.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gradeFilter, setGradeFilter] = React.useState("all");
  const [strategyFilter, setStrategyFilter] = React.useState<"all" | TieBreakStrategy>("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    year: "all",
    grade: "all",
    strategy: "all" as "all" | TieBreakStrategy,
    active: "all" as "all" | "active" | "inactive",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const yearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const promotionDecisionsQuery = usePromotionDecisionOptionsQuery();

  const rulesQuery = useGradingOutcomeRulesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
    tieBreakStrategy: strategyFilter === "all" ? undefined : strategyFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateGradingOutcomeRuleMutation();
  const updateMutation = useUpdateGradingOutcomeRuleMutation();
  const deleteMutation = useDeleteGradingOutcomeRuleMutation();

  const records = React.useMemo(() => rulesQuery.data?.data ?? [], [rulesQuery.data?.data]);
  const pagination = rulesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({
      year: yearFilter,
      grade: gradeFilter,
      strategy: strategyFilter,
      active: activeFilter,
    });
  }, [activeFilter, gradeFilter, isFilterOpen, strategyFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const validateForm = (): boolean => {
    if (!form.academicYearId || !form.gradeLevelId || !form.conditionalDecisionId || !form.retainedDecisionId) {
      setFormError("جميع الحقول الأساسية مطلوبة للبدء.");
      return false;
    }
    const promoted = parseIntValue(form.promotedMaxFailedSubjects);
    const conditional = parseIntValue(form.conditionalMaxFailedSubjects);
    if (promoted === undefined || conditional === undefined) {
      setFormError("قيم الرسوب يجب أن تكون أرقاماً صحيحة.");
      return false;
    }
    if (conditional < promoted) {
      setFormError("القيمة الشرطية يجب أن تكون أكبر من أو تساوي قيمة الترفيع.");
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setFormError(null);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: GradingOutcomeRuleListItem) => {
    if (!canUpdate) return;
    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      academicYearId: form.academicYearId,
      gradeLevelId: form.gradeLevelId,
      promotedMaxFailedSubjects: parseIntValue(form.promotedMaxFailedSubjects)!,
      conditionalMaxFailedSubjects: parseIntValue(form.conditionalMaxFailedSubjects)!,
      conditionalDecisionId: form.conditionalDecisionId,
      retainedDecisionId: form.retainedDecisionId,
      tieBreakStrategy: form.tieBreakStrategy,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ gradingOutcomeRuleId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: GradingOutcomeRuleListItem) => {
    if (!canDelete || !window.confirm("تأكيد حذف قاعدة مخرجات الدرجات هذه؟")) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setGradeFilter(filterDraft.grade);
    setStrategyFilter(filterDraft.strategy);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setGradeFilter("all");
    setStrategyFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", grade: "all", strategy: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      gradeFilter !== "all" ? 1 : 0,
      strategyFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, gradeFilter, searchInput, strategyFilter, yearFilter]);

  return (
    <PageShell
      title="قواعد مخرجات الدرجات"
      subtitle="تحديد معايير النجاح والرسوب، والقرارات المشروطة، واستراتيجيات الترتيب عند تساوي الدرجات."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث في القواعد..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void rulesQuery.refetch()}
              disabled={rulesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${rulesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر القواعد"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">السنة الأكاديمية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الصف الدراسي</label>
              <SelectField value={filterDraft.grade} onChange={(e) => setFilterDraft(p => ({ ...p, grade: e.target.value }))}>
                <option value="all">كل الصفوف</option>
                {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Medal className="h-5 w-5 text-primary" />
                قواعد تحديد النتائج
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              تتحكم هذه القواعد في المعالجة التلقائية لنتائج الطلاب في نهاية العام الدراسي.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {rulesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحليل قواعد المخرجات...
              </div>
            )}

            {!rulesQuery.isPending && records.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد قواعد مخرجات مسجلة للفلاتر المحددة.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                        {item.gradeLevel.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                        <Calendar className="h-3 w-3" />
                        <span>{item.academicYear.name}</span>
                      </div>
                    </div>
                    <Badge variant={item.isActive ? "default" : "secondary"} className="h-5 text-[8px] font-bold">
                      {item.isActive ? "نشطة" : "معطلة"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold">حد الترفيع</span>
                      </div>
                      <Badge variant="outline" className="h-6 font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                        {item.promotedMaxFailedSubjects} مادة
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-bold">حد القرار الشرطي</span>
                      </div>
                      <Badge variant="outline" className="h-6 font-bold bg-amber-50 text-amber-700 border-amber-200">
                        {item.conditionalMaxFailedSubjects} مادة
                      </Badge>
                    </div>
                    <div className="h-[1px] bg-border/40 my-2" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <ChevronLeft className="h-3 w-3" />
                        <span className="font-bold">استراتيجية التساوي:</span>
                        <span className="text-foreground">{translateTieBreakStrategy(item.tieBreakStrategy)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <ChevronLeft className="h-3 w-3" />
                        <span className="font-bold">قرار الإبقاء:</span>
                        <span className="text-foreground">{item.retainedDecision.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      تعديل القاعدة
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6 mt-2">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || rulesQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() =>
                    setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || rulesQuery.isFetching}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-5 w-5" />}
        label="إضافة قاعدة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل قاعدة النتائج" : "إضافة قاعدة نتائج جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> السنة الأكاديمية *
              </label>
              <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value }))}>
                <option value="">اختر السنة</option>
                {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> الصف الدراسي *
              </label>
              <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value }))}>
                <option value="">اختر الصف</option>
                {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2">حدود الرسوب (مواد رسابة)</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">حد الترفيع التلقائي</label>
                <Input type="number" min="0" max="20" value={form.promotedMaxFailedSubjects} onChange={(e) => setForm(p => ({ ...p, promotedMaxFailedSubjects: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">حد القرار الشرطي</label>
                <Input type="number" min="0" max="20" value={form.conditionalMaxFailedSubjects} onChange={(e) => setForm(p => ({ ...p, conditionalMaxFailedSubjects: e.target.value }))} placeholder="2" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">قرار الشرطي *</label>
              <SelectField value={form.conditionalDecisionId} onChange={(e) => setForm(p => ({ ...p, conditionalDecisionId: e.target.value }))}>
                <option value="">اختر القرار</option>
                {(promotionDecisionsQuery.data ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">قرار الإبقاء *</label>
              <SelectField value={form.retainedDecisionId} onChange={(e) => setForm(p => ({ ...p, retainedDecisionId: e.target.value }))}>
                <option value="">اختر القرار</option>
                {(promotionDecisionsQuery.data ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> استراتيجية فك التساوي (Tie break)
            </label>
            <SelectField value={form.tieBreakStrategy} onChange={(e) => setForm(p => ({ ...p, tieBreakStrategy: e.target.value as TieBreakStrategy }))}>
              <option value="PERCENTAGE_ONLY">{translateTieBreakStrategy("PERCENTAGE_ONLY")}</option>
              <option value="PERCENTAGE_THEN_TOTAL">{translateTieBreakStrategy("PERCENTAGE_THEN_TOTAL")}</option>
              <option value="PERCENTAGE_THEN_NAME">{translateTieBreakStrategy("PERCENTAGE_THEN_NAME")}</option>
            </SelectField>
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
            <span className="font-bold">تفعيل القاعدة للاستخدام</span>
            <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
          </label>

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold text-center">
              {formError}
            </div>
          )}
        </div>
      </CrudFormSheet>
    </PageShell>
  );
}

"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Medal,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Calendar,
  Layers,
  Settings2,
  AlertCircle,
  TrendingDown,
  ChevronLeft,
  Activity,
  History,
  Layout,
  CheckCircle2,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
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
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", grade: "all" });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const yearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const promotionDecisionsQuery = usePromotionDecisionOptionsQuery();

  const rulesQuery = useGradingOutcomeRulesQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
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
    setFilterDraft({ year: yearFilter, grade: gradeFilter });
  }, [gradeFilter, isFilterOpen, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: GradingOutcomeRuleListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicYearId || !form.gradeLevelId || !form.conditionalDecisionId || !form.retainedDecisionId) {
      setFormError("جميع الحقول الأساسية مطلوبة للبدء.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      gradeLevelId: form.gradeLevelId,
      promotedMaxFailedSubjects: parseIntValue(form.promotedMaxFailedSubjects) ?? 0,
      conditionalMaxFailedSubjects: parseIntValue(form.conditionalMaxFailedSubjects) ?? 2,
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
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setGradeFilter("all");
    setFilterDraft({ year: "all", grade: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, yearFilter !== "all" ? 1 : 0, gradeFilter !== "all" ? 1 : 0].reduce((acc, v) => acc + v, 0);
  }, [gradeFilter, searchInput, yearFilter]);

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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void rulesQuery.refetch()} disabled={rulesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${rulesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">السنة الأكاديمية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الصف الدراسي</label>
              <SelectField value={filterDraft.grade} onChange={(e) => setFilterDraft(p => ({ ...p, grade: e.target.value }))}>
                <option value="all">كل الصفوف</option>
                {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Medal className="h-5 w-5 text-primary" />
                هيكلة تحديد النتائج النهائية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {rulesQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل القواعد...</div>
            )}

            <div className="grid gap-0 divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 group-hover:bg-emerald-100 transition-colors shadow-sm">
                        <Target className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.gradeLevel.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-secondary-foreground border-border/70">
                            {item.academicYear.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-emerald-500" /> Max Fail: {item.promotedMaxFailedSubjects}</span>
                          <span className="opacity-30">•</span>
                          <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-500" /> Conditional: {item.conditionalMaxFailedSubjects}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic text-stone-500 bg-stone-50">
                           {translateTieBreakStrategy(item.tieBreakStrategy)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!rulesQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد قواعد مخرجات مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط المعالجة: القرارات الآلية للخريجين</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة قاعدة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير قاعدة المخرجات" : "تعريف قاعدة ترقية جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Layout className="h-3.5 w-3.5" /> نطاق التطبيق</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الأكاديمية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value }))}>
                  <option value="">اختر السنة</option>
                  {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الصف الدراسي المستهدف *</label>
                <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value }))}>
                  <option value="">اختر الصف</option>
                  {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> حدود الرسوب والنجاح</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">أقصى عدد مواد للترفيع (Promoted)</label>
                <Input type="number" value={form.promotedMaxFailedSubjects} onChange={(e) => setForm(p => ({ ...p, promotedMaxFailedSubjects: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">أقصى مواد للقرار المشروط (Conditional)</label>
                <Input type="number" value={form.conditionalMaxFailedSubjects} onChange={(e) => setForm(p => ({ ...p, conditionalMaxFailedSubjects: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> القرارات المعتمدة للنتائج</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">القرار في حالة الرسوب المشروط *</label>
                <SelectField value={form.conditionalDecisionId} onChange={(e) => setForm(p => ({ ...p, conditionalDecisionId: e.target.value }))}>
                  <option value="">اختر القرار</option>
                  {(promotionDecisionsQuery.data ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">القرار في حالة الإبقاء (Retained) *</label>
                <SelectField value={form.retainedDecisionId} onChange={(e) => setForm(p => ({ ...p, retainedDecisionId: e.target.value }))}>
                  <option value="">اختر القرار</option>
                  {(promotionDecisionsQuery.data ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> استراتيجية فك التساوي (Tie break)</label>
            <SelectField value={form.tieBreakStrategy} onChange={(e) => setForm(p => ({ ...p, tieBreakStrategy: e.target.value as TieBreakStrategy }))}>
              <option value="PERCENTAGE_ONLY">{translateTieBreakStrategy("PERCENTAGE_ONLY")}</option>
              <option value="PERCENTAGE_THEN_TOTAL">{translateTieBreakStrategy("PERCENTAGE_THEN_TOTAL")}</option>
              <option value="PERCENTAGE_THEN_NAME">{translateTieBreakStrategy("PERCENTAGE_THEN_NAME")}</option>
            </SelectField>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
             <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">تفعيل القاعدة (Active)</span>
                <p className="text-[10px] text-muted-foreground">تطبيق هذه القاعدة فورياً عند احتساب النتائج السنوية</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </label>
          </div>

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

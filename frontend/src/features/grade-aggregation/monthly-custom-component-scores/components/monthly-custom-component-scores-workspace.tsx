"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Lock,
  LockOpen,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  CalendarDays,
  User,
  BookOpen,
  GraduationCap,
  Info,
  Settings2,
  Trophy,
  Activity,
  Layout,
  LayoutGrid,
  ClipboardCheck,
  Zap,
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
import { useAcademicMonthOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-academic-month-options-query";
import { useSectionOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-subject-options-query";
import {
  useCreateMonthlyCustomComponentScoreMutation,
  useDeleteMonthlyCustomComponentScoreMutation,
  useUpdateMonthlyCustomComponentScoreMutation,
} from "@/features/grade-aggregation/monthly-custom-component-scores/hooks/use-monthly-custom-component-scores-mutations";
import { useGradingPolicyComponentOptionsQuery } from "@/features/grade-aggregation/monthly-custom-component-scores/hooks/use-grading-policy-component-options-query";
import { useMonthlyCustomComponentScoresQuery } from "@/features/grade-aggregation/monthly-custom-component-scores/hooks/use-monthly-custom-component-scores-query";
import { useMonthlyGradeOptionsQuery } from "@/features/grade-aggregation/monthly-custom-component-scores/hooks/use-monthly-grade-options-query";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type { MonthlyCustomComponentScoreListItem } from "@/lib/api/client";

type FormState = {
  monthlyGradeId: string;
  gradingPolicyComponentId: string;
  score: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  monthlyGradeId: "",
  gradingPolicyComponentId: "",
  score: "0",
  notes: "",
  isActive: true,
};

function toFormState(item: MonthlyCustomComponentScoreListItem): FormState {
  return {
    monthlyGradeId: item.monthlyGradeId,
    gradingPolicyComponentId: item.gradingPolicyComponentId,
    score: String(item.score),
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function MonthlyCustomComponentScoresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("monthly-custom-component-scores.create");
  const canUpdate = hasPermission("monthly-custom-component-scores.update");
  const canDelete = hasPermission("monthly-custom-component-scores.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [filterDraft, setFilterDraft] = React.useState({ month: "all", section: "all", subject: "all", active: "all" });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<MonthlyCustomComponentScoreListItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const monthsQuery = useAcademicMonthOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const scoresQuery = useMonthlyCustomComponentScoresQuery({
    page, limit: PAGE_SIZE, search: search || undefined,
    academicMonthId: monthFilter === "all" ? undefined : monthFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const monthlyGradesQuery = useMonthlyGradeOptionsQuery({
    academicMonthId: monthFilter === "all" ? undefined : monthFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
  });

  const selectedMonthlyGrade = React.useMemo(
    () => (monthlyGradesQuery.data ?? []).find(it => it.id === form.monthlyGradeId),
    [monthlyGradesQuery.data, form.monthlyGradeId],
  );

  const gradingPolicyContext = React.useMemo(() => {
    if (selectedMonthlyGrade) {
      return {
        gradingPolicyId: selectedMonthlyGrade.gradingPolicyId,
        academicYearId: selectedMonthlyGrade.academicYearId,
        gradeLevelId: selectedMonthlyGrade.studentEnrollment.section.gradeLevel.id,
        subjectId: selectedMonthlyGrade.subjectId,
      };
    }
    if (editingItem) {
      return {
        gradingPolicyId: editingItem.monthlyGrade.gradingPolicyId,
        academicYearId: editingItem.monthlyGrade.academicYearId,
        gradeLevelId: editingItem.monthlyGrade.studentEnrollment.section.gradeLevel?.id ?? '',
        subjectId: editingItem.monthlyGrade.subjectId,
      };
    }
    return null;
  }, [editingItem, selectedMonthlyGrade]);

  const componentsQuery = useGradingPolicyComponentOptionsQuery({ context: gradingPolicyContext });

  const createMutation = useCreateMonthlyCustomComponentScoreMutation();
  const updateMutation = useUpdateMonthlyCustomComponentScoreMutation();
  const deleteMutation = useDeleteMonthlyCustomComponentScoreMutation();

  const records = React.useMemo(() => scoresQuery.data?.data ?? [], [scoresQuery.data?.data]);
  const pagination = scoresQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ month: monthFilter, section: sectionFilter, subject: subjectFilter, active: activeFilter });
  }, [activeFilter, isFilterOpen, monthFilter, sectionFilter, subjectFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: MonthlyCustomComponentScoreListItem) => {
    if (!canUpdate || item.monthlyGrade.isLocked) return;
    setEditingId(item.id);
    setEditingItem(item);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.monthlyGradeId || !form.gradingPolicyComponentId) {
      setFormError("الدرجة الشهرية ومكون التقييم مطلوبان.");
      return;
    }

    const payload = {
      score: Number(form.score),
      notes: form.notes || undefined,
      isActive: form.isActive
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ monthlyCustomComponentScoreId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate({
        ...payload,
        monthlyGradeId: form.monthlyGradeId,
        gradingPolicyComponentId: form.gradingPolicyComponentId,
      }, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: MonthlyCustomComponentScoreListItem) => {
    if (!canDelete || item.monthlyGrade.isLocked || !window.confirm(`حذف درجة المكون ${item.gradingPolicyComponent.name} للطالب ${item.monthlyGrade.studentEnrollment.student.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setMonthFilter(filterDraft.month);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setMonthFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setActiveFilter("all");
    setFilterDraft({ month: "all", section: "all", subject: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      monthFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, monthFilter, searchInput, sectionFilter, subjectFilter]);

  const selectedComponent = (componentsQuery.data ?? []).find(it => it.id === form.gradingPolicyComponentId);

  return (
    <PageShell
      title="مكونات التقييم الشهرية"
      subtitle="رصد الدرجات للمكونات الإضافية (سلوك، انتظام، الخ) التي يتم إضافتها يدوياً لتكتمل الدرجة الشهرية للطالب."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الطالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void scoresQuery.refetch()} disabled={scoresQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${scoresQuery.isFetching ? "animate-spin" : ""}`} />
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">الشهر الدراسي</label>
              <SelectField value={filterDraft.month} onChange={(e) => setFilterDraft(p => ({ ...p, month: e.target.value }))}>
                <option value="all">كل الأشهر</option>
                {(monthsQuery.data ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">الشعبة</label>
              <SelectField value={filterDraft.section} onChange={(e) => setFilterDraft(p => ({ ...p, section: e.target.value }))}>
                <option value="all">كل الشعب</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">المادة</label>
              <SelectField value={filterDraft.subject} onChange={(e) => setFilterDraft(p => ({ ...p, subject: e.target.value }))}>
                <option value="all">كل المواد</option>
                {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                رصد القيم المضافة يدوياً
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {scoresQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل كشوف المكونات الإضافية...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.monthlyGrade.studentEnrollment.student.fullName}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <LayoutGrid className="h-3 w-3 text-primary" />
                        <span>{item.gradingPolicyComponent.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={item.monthlyGrade.isLocked ? "secondary" : "default"} className="h-5 text-[8px] font-bold uppercase gap-1">
                        {item.monthlyGrade.isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                        {item.monthlyGrade.isLocked ? "مقفل" : "مفتوح"}
                      </Badge>
                      <Badge variant="outline" className={`h-5 text-[8px] font-bold uppercase ${item.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-destructive/20 bg-destructive/5 text-destructive'}`}>
                        {item.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-primary/70 font-bold leading-none">الدرجة المرصودة</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-primary">{item.score}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">/ {item.gradingPolicyComponent.maxScore}</span>
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-primary/10">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{item.monthlyGrade.subject.name}</span>
                      <span className="mx-1">•</span>
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{item.monthlyGrade.academicMonth.name}</span>
                    </div>
                    {item.notes && (
                      <div className="flex items-start gap-2 text-[10px] font-medium bg-muted/30 p-2 rounded-lg border border-border/40 leading-relaxed italic text-muted-foreground">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        "{item.notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg border-border/60 hover:border-primary/50 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || item.monthlyGrade.isLocked}
                    >
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || item.monthlyGrade.isLocked}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6 mt-2">
              <p className="text-xs text-muted-foreground">صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong></p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-2xl" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-2xl" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة درجة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل درجة المكون" : "رصد درجة مكون يدوي جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> الربط بالنتيجة الشهرية</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">سجل الدرجة الشهرية المستهدف *</label>
                <SelectField value={form.monthlyGradeId} onChange={(e) => setForm(p => ({ ...p, monthlyGradeId: e.target.value, gradingPolicyComponentId: "" }))} disabled={isEditing}>
                  <option value="">اختر نتيجة شهرية من القائمة</option>
                  {(monthlyGradesQuery.data ?? []).map(g => (
                    <option key={g.id} value={g.id}>{g.studentEnrollment.student.fullName} - {g.academicMonth.name} - {g.subject.name}</option>
                  ))}
                </SelectField>
                <p className="text-[10px] text-muted-foreground px-1">القائمة تظهر النتائج المتوافقة مع فلاتر البحث الحالية.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> المكون والدرجة</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المكون التقييمي *</label>
                <SelectField value={form.gradingPolicyComponentId} onChange={(e) => setForm(p => ({ ...p, gradingPolicyComponentId: e.target.value }))} disabled={isEditing || !form.monthlyGradeId}>
                  <option value="">اختر مكوّناً متاحاً (سلوك، مشاركة...)</option>
                  {(componentsQuery.data ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.name} (أقصى درجة: {c.maxScore})</option>
                  ))}
                </SelectField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center justify-between">
                    <span>الدرجة المستحقة</span>
                    {selectedComponent && <Badge variant="outline" className="text-[8px] h-4 leading-none">MAX: {selectedComponent.maxScore}</Badge>}
                  </label>
                  <Input type="number" step="0.01" value={form.score} onChange={(e) => setForm(p => ({ ...p, score: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الحالة</label>
                  <label className="flex items-center justify-between h-10 px-3 bg-background/50 rounded-xl border border-border/50">
                    <span className="text-xs font-bold">نشط</span>
                    <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> تفاصيل إضافية</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none">ملاحظات الرصد</label>
              <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أسباب التقييم أو ملاحظات حول أداء الطالب..." />
            </div>
          </div>

          {!selectedMonthlyGrade && !isEditing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-3 text-xs text-amber-800 leading-relaxed">
              <Zap className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p>يجب اختيار سجل الدرجة الشهرية أولاً لتحديد قائمة المكونات المتاحة حسب سياسة التقييم المعتمدة للطالب.</p>
            </div>
          )}

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

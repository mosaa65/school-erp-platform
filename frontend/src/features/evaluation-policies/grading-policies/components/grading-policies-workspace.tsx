"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Layers,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Info,
  Settings2,
  GraduationCap,
  Trophy,
  Layout,
  BarChart,
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
import {
  useCreateGradingPolicyMutation,
  useDeleteGradingPolicyMutation,
  useUpdateGradingPolicyMutation,
} from "@/features/evaluation-policies/grading-policies/hooks/use-grading-policies-mutations";
import { useGradingPoliciesQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-grading-policies-query";
import { useAcademicYearOptionsQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-grade-level-options-query";
import { useSubjectOptionsQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-subject-options-query";
import { useAcademicTermOptionsQuery } from "@/features/academic-months/hooks/use-academic-term-options-query";
import {
  translateAssessmentType,
  translateGradingWorkflowStatus,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type {
  AssessmentType,
  GradingPolicyListItem,
  GradingWorkflowStatus,
} from "@/lib/api/client";

type GradingPolicyFormState = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  totalMaxScore: string;
  academicTermId: string;
  passingScore: string;
  isDefault: boolean;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const ASSESSMENT_OPTIONS: AssessmentType[] = [
  "MONTHLY", "MIDTERM", "FINAL", "QUIZ", "ORAL", "PRACTICAL", "PROJECT",
];

const WORKFLOW_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED",
];

const DEFAULT_FORM_STATE: GradingPolicyFormState = {
  academicYearId: "",
  gradeLevelId: "",
  subjectId: "",
  assessmentType: "MONTHLY",
  totalMaxScore: "",
  academicTermId: "",
  passingScore: "",
  isDefault: false,
  status: "DRAFT",
  notes: "",
  isActive: true,
};

function toFormState(item: GradingPolicyListItem): GradingPolicyFormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId,
    subjectId: item.subjectId,
    assessmentType: item.assessmentType,
    totalMaxScore: String(item.totalMaxScore ?? ""),
    academicTermId: item.academicTermId ?? "",
    passingScore: String(item.passingScore ?? ""),
    isDefault: item.isDefault,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function GradingPoliciesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grading-policies.create");
  const canUpdate = hasPermission("grading-policies.update");
  const canDelete = hasPermission("grading-policies.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gradeFilter, setGradeFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [assessmentFilter, setAssessmentFilter] = React.useState("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", grade: "all", subject: "all", assessment: "all" });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<GradingPolicyFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const policiesQuery = useGradingPoliciesQuery({
    page, limit: PAGE_SIZE, search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    assessmentType: assessmentFilter === "all" ? undefined : assessmentFilter as any,
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeOptionsQuery = useGradeLevelOptionsQuery();
  const subjectOptionsQuery = useSubjectOptionsQuery();
  const termOptionsQuery = useAcademicTermOptionsQuery(form.academicYearId || undefined);

  const createMutation = useCreateGradingPolicyMutation();
  const updateMutation = useUpdateGradingPolicyMutation();
  const deleteMutation = useDeleteGradingPolicyMutation();

  const records = React.useMemo(() => policiesQuery.data?.data ?? [], [policiesQuery.data?.data]);
  const pagination = policiesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, grade: gradeFilter, subject: subjectFilter, assessment: assessmentFilter });
  }, [assessmentFilter, gradeFilter, isFilterOpen, subjectFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: GradingPolicyListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.academicYearId || !form.gradeLevelId || !form.subjectId || !form.totalMaxScore) {
      setFormError("الرجاء إكمال كافة الحقول الأساسية.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      gradeLevelId: form.gradeLevelId,
      subjectId: form.subjectId,
      assessmentType: form.assessmentType,
      totalMaxScore: Number(form.totalMaxScore),
      academicTermId: form.academicTermId || undefined,
      passingScore: form.passingScore ? Number(form.passingScore) : undefined,
      isDefault: form.isDefault,
      status: form.status,
      notes: form.notes || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ gradingPolicyId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: GradingPolicyListItem) => {
    if (!canDelete || !window.confirm(`حذف سياسة التقييم لمادة ${item.subject.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setGradeFilter(filterDraft.grade);
    setSubjectFilter(filterDraft.subject);
    setAssessmentFilter(filterDraft.assessment);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setGradeFilter("all");
    setSubjectFilter("all");
    setAssessmentFilter("all");
    setFilterDraft({ year: "all", grade: "all", subject: "all", assessment: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      gradeFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      assessmentFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [assessmentFilter, gradeFilter, searchInput, subjectFilter, yearFilter]);

  return (
    <PageShell
      title="سياسات التقييم"
      subtitle="تحديد أوزان الدرجات ودرجات النجاح للمواد الدراسية المختلفة حسب الصفوف والسنوات الأكاديمية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث عن سياسة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void policiesQuery.refetch()} disabled={policiesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${policiesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفرز"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">السنة الدراسية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">الصف</label>
              <SelectField value={filterDraft.grade} onChange={(e) => setFilterDraft(p => ({ ...p, grade: e.target.value }))}>
                <option value="all">كل الصفوف</option>
                {(gradeOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none px-1">المادة</label>
              <SelectField value={filterDraft.subject} onChange={(e) => setFilterDraft(p => ({ ...p, subject: e.target.value }))}>
                <option value="all">كل المواد</option>
                {(subjectOptionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Layers className="h-5 w-5 text-primary" />
                سجل أوزان المواد
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {policiesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل سياسات التقييم...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.subject.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <GraduationCap className="h-3 w-3" />
                        <span>{item.gradeLevel.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-bold uppercase ${item.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                        {item.isActive ? "نشط" : "معطل"}
                      </Badge>
                      <Badge variant="secondary" className="h-5 text-[8px] font-bold uppercase">
                        {translateGradingWorkflowStatus(item.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-primary/5 p-3 flex flex-col items-center justify-center space-y-1">
                      <span className="text-[10px] uppercase text-primary/70 font-bold leading-none">النجاح</span>
                      <span className="text-xl font-black text-primary">{item.passingScore ?? "0"}</span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col items-center justify-center space-y-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none">الإجمالي</span>
                      <span className="text-xl font-black text-foreground">{item.totalMaxScore}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold px-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Trophy className="h-3.5 w-3.5" />
                        <span>{translateAssessmentType(item.assessmentType)}</span>
                      </div>
                      {item.isDefault && <Badge variant="outline" className="text-[8px] h-4 leading-none bg-sky-50 text-sky-700 border-sky-200">افتراضي</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground px-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{item.academicYear.name}</span>
                      {item.academicTerm && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{item.academicTerm.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg border-border/60 hover:border-primary/50 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate}
                    >
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete}
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة سياسة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل سياسة التقييم" : "إنشاء سياسة تقييم جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> التعريف الأكاديمي</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الدراسية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, academicTermId: "" }))} disabled={isEditing}>
                  <option value="">اختر السنة</option>
                  {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الصف الدراسي *</label>
                <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value }))} disabled={isEditing}>
                  <option value="">اختر الصف</option>
                  {(gradeOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المادة التعليمية *</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))} disabled={isEditing}>
                  <option value="">اختر المادة</option>
                  {(subjectOptionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> هيكلية الدرجات</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">نوع الترقيم/التقييم *</label>
                <SelectField value={form.assessmentType} onChange={(e) => setForm(p => ({ ...p, assessmentType: e.target.value as any }))}>
                  {ASSESSMENT_OPTIONS.map(a => <option key={a} value={a}>{translateAssessmentType(a)}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الفصل المرتبط</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">كافة الفصول (سياسة عامة)</option>
                  {(termOptionsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الدرجة النهائية *</label>
                <Input type="number" value={form.totalMaxScore} onChange={(e) => setForm(p => ({ ...p, totalMaxScore: e.target.value }))} placeholder="100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الحد الأدنى للنجاح</label>
                <Input type="number" value={form.passingScore} onChange={(e) => setForm(p => ({ ...p, passingScore: e.target.value }))} placeholder="50" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><BarChart className="h-3.5 w-3.5" /> الحالة والتحكم</h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">سير العمل</label>
                  <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                    {WORKFLOW_OPTIONS.map(s => <option key={s} value={s}>{translateGradingWorkflowStatus(s)}</option>)}
                  </SelectField>
                </div>
                <div className="flex gap-4 pt-4">
                  <label className="flex flex-1 items-center justify-between px-3 py-2 bg-background/50 rounded-xl border border-border/50 cursor-pointer">
                    <span className="text-[10px] font-bold">افتراضية</span>
                    <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isDefault} onChange={(e) => setForm(p => ({ ...p, isDefault: e.target.checked }))} />
                  </label>
                  <label className="flex flex-1 items-center justify-between px-3 py-2 bg-background/50 rounded-xl border border-border/50 cursor-pointer">
                    <span className="text-[10px] font-bold">نشطة</span>
                    <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">ملاحظات توضيحية</label>
                <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="تظهر للمعلمين عند رصد الدرجات..." />
              </div>
            </div>
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

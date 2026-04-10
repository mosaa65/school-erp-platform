"use client";

import * as React from "react";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Layers,
  LoaderCircle,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Info,
  ChevronLeft,
  Settings2,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SelectField } from "@/components/ui/select-field";
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
  "MONTHLY",
  "MIDTERM",
  "FINAL",
  "QUIZ",
  "ORAL",
  "PRACTICAL",
  "PROJECT",
];

const WORKFLOW_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "ARCHIVED",
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

type FilterDraftState = {
  year: string;
  grade: string;
  subject: string;
  term: string;
  assessment: AssessmentType | "all";
  status: GradingWorkflowStatus | "all";
  defaultType: "all" | "default" | "custom";
  active: "all" | "active" | "inactive";
};

const DEFAULT_FILTER_STATE: FilterDraftState = {
  year: "all",
  grade: "all",
  subject: "all",
  term: "all",
  assessment: "all",
  status: "all",
  defaultType: "all",
  active: "all",
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

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  const [termFilter, setTermFilter] = React.useState("all");
  const [assessmentFilter, setAssessmentFilter] = React.useState<AssessmentType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [defaultFilter, setDefaultFilter] = React.useState<"all" | "default" | "custom">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<FilterDraftState>(DEFAULT_FILTER_STATE);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<GradingPolicyFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const policiesQuery = useGradingPoliciesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    assessmentType: assessmentFilter === "all" ? undefined : assessmentFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isDefault: defaultFilter === "all" ? undefined : defaultFilter === "default" ? true : false,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeOptionsQuery = useGradeLevelOptionsQuery();
  const subjectOptionsQuery = useSubjectOptionsQuery();
  const termOptionsQuery = useAcademicTermOptionsQuery(form.academicYearId || undefined);
  const filterTermsQuery = useAcademicTermOptionsQuery(filterDraft.year === "all" ? undefined : filterDraft.year);

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
    setFilterDraft({
      year: yearFilter,
      grade: gradeFilter,
      subject: subjectFilter,
      term: termFilter,
      assessment: assessmentFilter,
      status: statusFilter,
      defaultType: defaultFilter,
      active: activeFilter,
    });
  }, [activeFilter, assessmentFilter, defaultFilter, gradeFilter, isFilterOpen, statusFilter, subjectFilter, termFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const validateForm = (): boolean => {
    if (!form.academicYearId || !form.gradeLevelId || !form.subjectId) {
      setFormError("السنة والصف والمادة حقول إجبارية.");
      return false;
    }
    const total = parseOptionalNumber(form.totalMaxScore);
    if (!total || total <= 0) {
      setFormError("يجب تحديد الدرجة القصوى (أكبر من صفر).");
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setFormError(null);
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: GradingPolicyListItem) => {
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
      subjectId: form.subjectId,
      assessmentType: form.assessmentType,
      totalMaxScore: parseOptionalNumber(form.totalMaxScore)!,
      academicTermId: form.academicTermId || undefined,
      passingScore: parseOptionalNumber(form.passingScore),
      isDefault: form.isDefault,
      status: form.status,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ gradingPolicyId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: GradingPolicyListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف سياسة ${item.subject.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setGradeFilter(filterDraft.grade);
    setSubjectFilter(filterDraft.subject);
    setTermFilter(filterDraft.term);
    setAssessmentFilter(filterDraft.assessment);
    setStatusFilter(filterDraft.status);
    setDefaultFilter(filterDraft.defaultType);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setGradeFilter("all");
    setSubjectFilter("all");
    setTermFilter("all");
    setAssessmentFilter("all");
    setStatusFilter("all");
    setDefaultFilter("all");
    setActiveFilter("all");
    setFilterDraft(DEFAULT_FILTER_STATE);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      gradeFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      assessmentFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      defaultFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, assessmentFilter, defaultFilter, gradeFilter, searchInput, statusFilter, subjectFilter, termFilter, yearFilter]);

  return (
    <PageShell
      title="سياسات التقييم والدرجات"
      subtitle="إدارة وتحديد أوزان الدرجات، درجات النجاح، وهيكلة الاختبارات لكل مادة وصف دراسي."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث عن سياسة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void policiesQuery.refetch()}
              disabled={policiesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${policiesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر سياسات التقييم"
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase leading-none">السنة</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value, term: "all" }))}>
                <option value="all">كل السنوات</option>
                {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase leading-none">الصف</label>
              <SelectField value={filterDraft.grade} onChange={(e) => setFilterDraft(p => ({ ...p, grade: e.target.value }))}>
                <option value="all">كل الصفوف</option>
                {(gradeOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase leading-none">المادة</label>
              <SelectField value={filterDraft.subject} onChange={(e) => setFilterDraft(p => ({ ...p, subject: e.target.value }))}>
                <option value="all">كل المواد</option>
                {(subjectOptionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase leading-none">نوع التقييم</label>
              <SelectField value={filterDraft.assessment} onChange={(e) => setFilterDraft(p => ({ ...p, assessment: e.target.value as any }))}>
                <option value="all">كل الأنواع</option>
                {ASSESSMENT_OPTIONS.map(a => <option key={a} value={a}>{translateAssessmentType(a)}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Medal className="h-5 w-5 text-primary" />
                سجل سياسات التقييم
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              قائمة تفصيلية بالأوزان المعتمدة للمواد الدراسية ومستويات الصفوف.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {policiesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل سياسات التقييم...
              </div>
            )}

            {!policiesQuery.isPending && records.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لم يتم العثور على سياسات تتوافق مع البحث.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                        {item.subject.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <CalendarDays className="h-3 w-3" />
                        <span>{item.academicYear.name} - {item.gradeLevel.name}</span>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(item.status)} className="h-5 text-[8px] font-bold">
                      {translateGradingWorkflowStatus(item.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">نوع التقييم</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground capitalize">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" />
                        <span>{translateAssessmentType(item.assessmentType)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">الدرجة القصوى</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Medal className="h-3.5 w-3.5 text-emerald-600/70" />
                        <span>{item.totalMaxScore}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 pt-3 mt-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {item.isDefault && <Badge variant="outline" className="h-5 bg-sky-50 text-sky-700 border-sky-200 text-[8px]">افتراضية</Badge>}
                      {item.isActive ? <Badge variant="outline" className="h-5 bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px]">نشطة</Badge> : <Badge variant="outline" className="h-5 bg-stone-50 text-stone-700 border-stone-200 text-[8px]">معطلة</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-2"
                        onClick={() => handleStartEdit(item)}
                        disabled={!canUpdate || updateMutation.isPending}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
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
                  disabled={!pagination || pagination.page <= 1 || policiesQuery.isFetching}
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
                  disabled={!pagination || pagination.page >= pagination.totalPages || policiesQuery.isFetching}
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
        label="إضافة سياسة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل سياسة التقييم" : "إضافة سياسة تقييم جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> النطاق الأكاديمي
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">السنة الأكاديمية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, academicTermId: "" }))}>
                  <option value="">اختر السنة</option>
                  {(yearOptionsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">الصف الدراسي *</label>
                <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value }))}>
                  <option value="">اختر الصف</option>
                  {(gradeOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">المادة الدراسية *</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">اختر المادة</option>
                  {(subjectOptionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> إعدادات التقييم
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">نوع التقييم *</label>
                <SelectField value={form.assessmentType} onChange={(e) => setForm(p => ({ ...p, assessmentType: e.target.value as any }))}>
                  {ASSESSMENT_OPTIONS.map(a => <option key={a} value={a}>{translateAssessmentType(a)}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">الفصل الدراسي</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">كل الفصول</option>
                  {(termOptionsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الدرجة القصوى *</label>
                <Input type="number" value={form.totalMaxScore} onChange={(e) => setForm(p => ({ ...p, totalMaxScore: e.target.value }))} placeholder="مثال: 100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">درجة النجاح</label>
                <Input type="number" value={form.passingScore} onChange={(e) => setForm(p => ({ ...p, passingScore: e.target.value }))} placeholder="مثال: 50" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> ملاحظات إضافية
            </label>
            <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="معلومات تظهر للمعلم عند رصد الدرجات" />
          </div>

          <div className="grid gap-3 pt-2">
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              <span className="font-bold">حالة الاعتماد</span>
              <SelectField className="w-auto h-8 px-2 text-xs" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                {WORKFLOW_OPTIONS.map(s => <option key={s} value={s}>{translateGradingWorkflowStatus(s)}</option>)}
              </SelectField>
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
                <span className="font-bold">افتراضية</span>
                <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isDefault} onChange={(e) => setForm(p => ({ ...p, isDefault: e.target.checked }))} />
              </label>
              <label className="flex flex-1 items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
                <span className="font-bold">نشطة</span>
                <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              </label>
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

function statusBadgeVariant(status: GradingWorkflowStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "APPROVED": return "default";
    case "IN_REVIEW": return "secondary";
    default: return "outline";
  }
}

"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Lock,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  CalendarDays,
  Medal,
  BookOpen,
  Layout,
  Clock,
  Info,
  ChevronLeft,
  Settings2,
  GraduationCap,
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
  useCreateExamAssessmentMutation,
  useDeleteExamAssessmentMutation,
  useUpdateExamAssessmentMutation,
} from "@/features/exams/exam-assessments/hooks/use-exam-assessments-mutations";
import { useExamAssessmentsQuery } from "@/features/exams/exam-assessments/hooks/use-exam-assessments-query";
import { useExamPeriodOptionsQuery } from "@/features/exams/exam-assessments/hooks/use-exam-period-options-query";
import { useSectionOptionsQuery } from "@/features/exams/exam-assessments/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/exams/exam-assessments/hooks/use-subject-options-query";
import { translateAssessmentType } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type { AssessmentType, ExamAssessmentListItem } from "@/lib/api/client";

type ExamAssessmentFormState = {
  examPeriodId: string;
  sectionId: string;
  subjectId: string;
  title: string;
  examDate: string;
  maxScore: string;
  notes: string;
  isActive: boolean;
};

type ExamAssessmentFilterDraft = {
  examPeriodId: string;
  sectionId: string;
  subjectId: string;
  activeFilter: "all" | "active" | "inactive";
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: ExamAssessmentFormState = {
  examPeriodId: "",
  sectionId: "",
  subjectId: "",
  title: "",
  examDate: "",
  maxScore: "",
  notes: "",
  isActive: true,
};

const DEFAULT_FILTER_DRAFT: ExamAssessmentFilterDraft = {
  examPeriodId: "all",
  sectionId: "all",
  subjectId: "all",
  activeFilter: "all",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateTimeLocalInput(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-SA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function toFormState(item: ExamAssessmentListItem): ExamAssessmentFormState {
  return {
    examPeriodId: item.examPeriodId,
    sectionId: item.sectionId,
    subjectId: item.subjectId,
    title: item.title,
    examDate: toDateTimeLocalInput(item.examDate),
    maxScore: String(item.maxScore),
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function ExamAssessmentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("exam-assessments.create");
  const canUpdate = hasPermission("exam-assessments.update");
  const canDelete = hasPermission("exam-assessments.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<ExamAssessmentFilterDraft>(DEFAULT_FILTER_DRAFT);
  
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<ExamAssessmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const periodsQuery = useExamPeriodOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const assessmentsQuery = useExamAssessmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    examPeriodId: periodFilter === "all" ? undefined : periodFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateExamAssessmentMutation();
  const updateMutation = useUpdateExamAssessmentMutation();
  const deleteMutation = useDeleteExamAssessmentMutation();

  const records = React.useMemo(() => assessmentsQuery.data?.data ?? [], [assessmentsQuery.data?.data]);
  const pagination = assessmentsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({
      examPeriodId: periodFilter,
      sectionId: sectionFilter,
      subjectId: subjectFilter,
      activeFilter: activeFilter,
    });
  }, [activeFilter, isFilterOpen, periodFilter, sectionFilter, subjectFilter]);

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

  const handleStartEdit = (item: ExamAssessmentListItem) => {
    if (!canUpdate || item.examPeriod.isLocked) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.examPeriodId || !form.sectionId || !form.subjectId || !form.title.trim() || !form.examDate) {
      setFormError("جميع الحقول المميزة بـ * مطلوبة.");
      return;
    }

    const payload = {
      examPeriodId: form.examPeriodId,
      sectionId: form.sectionId,
      subjectId: form.subjectId,
      title: form.title.trim(),
      examDate: toDateTimeIso(form.examDate),
      maxScore: Number(form.maxScore),
      notes: toOptionalString(form.notes),
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ examAssessmentId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: ExamAssessmentListItem) => {
    if (!canDelete || item.examPeriod.isLocked || !window.confirm(`تأكيد حذف الاختبار ${item.title}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setPeriodFilter(filterDraft.examPeriodId);
    setSectionFilter(filterDraft.sectionId);
    setSubjectFilter(filterDraft.subjectId);
    setActiveFilter(filterDraft.activeFilter);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setPeriodFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setActiveFilter("all");
    setFilterDraft(DEFAULT_FILTER_DRAFT);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      periodFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, periodFilter, searchInput, sectionFilter, subjectFilter]);

  return (
    <PageShell
      title="تقييمات الاختبارات"
      subtitle="إدارة المواعيد، الأوزان، ومعايير تقييم الاختبارات النصفية والنهائية لكل مادة وشعبة دراسية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث في التقييمات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void assessmentsQuery.refetch()}
              disabled={assessmentsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${assessmentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الاختبارات"
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
              <label className="text-xs font-medium text-muted-foreground uppercase">الفترة</label>
              <SelectField value={filterDraft.examPeriodId} onChange={(e) => setFilterDraft(p => ({ ...p, examPeriodId: e.target.value }))}>
                <option value="all">كل الفترات</option>
                {(periodsQuery.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الشعبة</label>
              <SelectField value={filterDraft.sectionId} onChange={(e) => setFilterDraft(p => ({ ...p, sectionId: e.target.value }))}>
                <option value="all">كل الشعب</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Medal className="h-5 w-5 text-primary" />
                سجل التقييمات الاختبارية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {assessmentsQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل التقييمات...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <CalendarDays className="h-3 w-3" />
                        <span>{item.examPeriod.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {item.examPeriod.isLocked && (
                        <Badge variant="outline" className="h-5 text-[8px] font-bold bg-amber-50 text-amber-700 border-amber-200 gap-1">
                          <Lock className="h-2.5 w-2.5" /> مقفل
                        </Badge>
                      )}
                      <Badge variant={item.isActive ? "default" : "secondary"} className="h-5 text-[8px] font-bold uppercase">
                        {item.isActive ? "مفعل" : "معطل"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">المادة</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <BookOpen className="h-3.5 w-3.5 text-primary/70" />
                        <span>{item.subject.name}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">الشعبة</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <Layout className="h-3.5 w-3.5 text-sky-600/70" />
                        <span>{item.section.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                      <span className="text-muted-foreground font-medium">موعد الاختبار</span>
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        {formatDateTime(item.examDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground font-medium">الدرجة العظمى</span>
                      <Badge variant="outline" className="font-bold border-primary/20 text-primary">{item.maxScore}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg border-border/60 hover:border-primary/50 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || item.examPeriod.isLocked}
                    >
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || item.examPeriod.isLocked}
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة تقييم" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل تقييم اختباري" : "إضافة تقييم اختباري جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> النطاق الأكاديمي</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">فترة الاختبار *</label>
                <SelectField value={form.examPeriodId} onChange={(e) => setForm(p => ({ ...p, examPeriodId: e.target.value }))}>
                  <option value="">اختر فترة الاختبار</option>
                  {(periodsQuery.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الشعبة الدراسية *</label>
                <SelectField value={form.sectionId} onChange={(e) => setForm(p => ({ ...p, sectionId: e.target.value }))}>
                  <option value="">اختر الشعبة</option>
                  {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المادة الدراسية *</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">اختر المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> تفاصيل التقييم</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">عنوان الاختبار *</label>
                <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: اختبار الشهر الأول - رياضيات" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">موعد الاختبار *</label>
                  <Input type="datetime-local" value={form.examDate} onChange={(e) => setForm(p => ({ ...p, examDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الدرجة العظمى *</label>
                  <Input type="number" value={form.maxScore} onChange={(e) => setForm(p => ({ ...p, maxScore: e.target.value }))} placeholder="مثال: 50" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> ملاحظات للمصحح</label>
            <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="تعليمات إضافية حول التقييم..." />
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/30">
            <span className="font-bold">تفعيل الاختبار للرصد</span>
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

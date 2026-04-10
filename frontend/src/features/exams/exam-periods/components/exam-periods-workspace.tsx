"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Plus,
  Lock,
  LockOpen,
  PencilLine,
  RefreshCw,
  Trash2,
  CalendarDays,
  Medal,
  Activity,
  CheckCircle2,
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
  useCreateExamPeriodMutation,
  useDeleteExamPeriodMutation,
  useUpdateExamPeriodMutation,
} from "@/features/exams/exam-periods/hooks/use-exam-periods-mutations";
import { useExamPeriodsQuery } from "@/features/exams/exam-periods/hooks/use-exam-periods-query";
import { useAcademicYearOptionsQuery } from "@/features/exams/exam-periods/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/exams/exam-periods/hooks/use-academic-term-options-query";
import {
  translateAssessmentType,
  translateGradingWorkflowStatus,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type {
  AssessmentType,
  ExamPeriodListItem,
  GradingWorkflowStatus,
} from "@/lib/api/client";

type ExamPeriodFormState = {
  academicYearId: string;
  academicTermId: string;
  name: string;
  assessmentType: AssessmentType;
  startDate: string;
  endDate: string;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  isActive: boolean;
};

type ExamPeriodFiltersState = {
  academicYearId: string;
  academicTermId: string;
  assessmentType: AssessmentType | "all";
  status: GradingWorkflowStatus | "all";
  locked: "all" | "locked" | "unlocked";
  active: "all" | "active" | "inactive";
};

const PAGE_SIZE = 12;

const ASSESSMENT_TYPE_OPTIONS: AssessmentType[] = [
  "MONTHLY", "MIDTERM", "FINAL", "QUIZ", "ORAL", "PRACTICAL", "PROJECT",
];

const WORKFLOW_STATUS_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED",
];

const DEFAULT_FORM_STATE: ExamPeriodFormState = {
  academicYearId: "",
  academicTermId: "",
  name: "",
  assessmentType: "MONTHLY",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  isLocked: false,
  isActive: true,
};

const DEFAULT_FILTERS: ExamPeriodFiltersState = {
  academicYearId: "all",
  academicTermId: "all",
  assessmentType: "all",
  status: "all",
  locked: "all",
  active: "all",
};

function toDateTimeLocalInput(isoDateTime: string | null): string {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
}

function formatPeriodDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function toFormState(item: ExamPeriodListItem): ExamPeriodFormState {
  return {
    academicYearId: item.academicYearId,
    academicTermId: item.academicTermId,
    name: item.name,
    assessmentType: item.assessmentType,
    startDate: toDateTimeLocalInput(item.startDate),
    endDate: toDateTimeLocalInput(item.endDate),
    status: item.status,
    isLocked: item.isLocked,
    isActive: item.isActive,
  };
}

export function ExamPeriodsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("exam-periods.create");
  const canUpdate = hasPermission("exam-periods.update");
  const canDelete = hasPermission("exam-periods.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<AssessmentType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [lockedFilter, setLockedFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<ExamPeriodFiltersState>(DEFAULT_FILTERS);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<ExamPeriodFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const yearsQuery = useAcademicYearOptionsQuery();
  const termsQuery = useAcademicTermOptionsQuery(form.academicYearId || (yearFilter === "all" ? undefined : yearFilter));
  const filterTermsQuery = useAcademicTermOptionsQuery(filterDraft.academicYearId === "all" ? undefined : filterDraft.academicYearId);
  
  const examPeriodsQuery = useExamPeriodsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    assessmentType: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isLocked: lockedFilter === "all" ? undefined : lockedFilter === "locked",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateExamPeriodMutation();
  const updateMutation = useUpdateExamPeriodMutation();
  const deleteMutation = useDeleteExamPeriodMutation();

  const records = React.useMemo(() => examPeriodsQuery.data?.data ?? [], [examPeriodsQuery.data?.data]);
  const pagination = examPeriodsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({
      academicYearId: yearFilter,
      academicTermId: termFilter,
      assessmentType: typeFilter,
      status: statusFilter,
      locked: lockedFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, yearFilter, termFilter, typeFilter, statusFilter, lockedFilter]);

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

  const handleStartEdit = (item: ExamPeriodListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicYearId || !form.academicTermId || !form.name.trim()) {
      setFormError("السنة، الفصل، واسم الفترة حقول إجبارية.");
      return;
    }

    const payload = {
      academicYearId: form.academicYearId,
      academicTermId: form.academicTermId,
      name: form.name.trim(),
      assessmentType: form.assessmentType,
      startDate: form.startDate ? toDateTimeIso(form.startDate) : undefined,
      endDate: form.endDate ? toDateTimeIso(form.endDate) : undefined,
      status: form.status,
      isLocked: form.isLocked,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ examPeriodId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: ExamPeriodListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف الفترة ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.academicYearId);
    setTermFilter(filterDraft.academicTermId);
    setTypeFilter(filterDraft.assessmentType);
    setStatusFilter(filterDraft.status);
    setLockedFilter(filterDraft.locked);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTermFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setLockedFilter("all");
    setActiveFilter("all");
    setFilterDraft(DEFAULT_FILTERS);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      typeFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      lockedFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, searchInput, yearFilter, termFilter, typeFilter, statusFilter, lockedFilter]);

  return (
    <PageShell
      title="الفترات الاختبارية"
      subtitle="إدارة وتحديد الجدولة الزمنية للاختبارات الشهرية والسنوية، والتحكم في حالات الاعتماد والقفل."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث في الفترات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void examPeriodsQuery.refetch()} disabled={examPeriodsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${examPeriodsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الفترات الاختبارية"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">السنة</label>
              <SelectField value={filterDraft.academicYearId} onChange={(e) => setFilterDraft(p => ({ ...p, academicYearId: e.target.value, academicTermId: "all" }))}>
                <option value="all">كل السنوات</option>
                {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الفصل</label>
              <SelectField value={filterDraft.academicTermId} onChange={(e) => setFilterDraft(p => ({ ...p, academicTermId: e.target.value }))}>
                <option value="all">كل الفصول</option>
                {(filterTermsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CalendarDays className="h-5 w-5 text-primary" />
                سجل الفترات المعتمدة
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {examPeriodsQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل الفترات الاختبارية...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        <span>من {formatPeriodDate(item.startDate)} إلى {formatPeriodDate(item.endDate)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={item.isLocked ? "secondary" : "default"} className="h-5 text-[8px] font-bold uppercase gap-1">
                        {item.isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                        {item.isLocked ? "مقفل" : "مفتوح"}
                      </Badge>
                      <Badge variant="outline" className="h-5 text-[8px] font-bold uppercase border-slate-200 bg-slate-50 text-slate-700">
                        {translateGradingWorkflowStatus(item.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">نوع التقييم</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <Medal className="h-3.5 w-3.5 text-primary/70" />
                        <span>{translateAssessmentType(item.assessmentType)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">الفصل الأكاديمي</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <Activity className="h-3.5 w-3.5 text-sky-600/70" />
                        <span>{item.academicTerm.name}</span>
                      </div>
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة فترة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل الفترة الاختبارية" : "إضافة فترة اختبارية جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> النطاق الأكاديمي</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الأكاديمية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, academicTermId: "" }))}>
                  <option value="">اختر السنة</option>
                  {(yearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الفصل الأكاديمي *</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">اختر الفصل</option>
                  {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> إعدادات الفترة</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم الفترة الاختبارية *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: اختبارات منتصف الفصل الأول" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">نوع التقييم المرتبط *</label>
                  <SelectField value={form.assessmentType} onChange={(e) => setForm(p => ({ ...p, assessmentType: e.target.value as any }))}>
                    {ASSESSMENT_TYPE_OPTIONS.map(a => <option key={a} value={a}>{translateAssessmentType(a)}</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة الاعتماد *</label>
                  <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                    {WORKFLOW_STATUS_OPTIONS.map(s => <option key={s} value={s}>{translateGradingWorkflowStatus(s)}</option>)}
                  </SelectField>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ البدء</label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ الانتهاء</label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 pt-2">
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Lock className={`h-4 w-4 ${form.isLocked ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className="font-bold">قفل الفترة (منع رصد الدرجات)</span>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isLocked} onChange={(e) => setForm(p => ({ ...p, isLocked: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/30">
              <span className="font-bold">تفعيل الفترة للاستخدام</span>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
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

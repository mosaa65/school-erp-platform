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
  BarChart3,
  Layout,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
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
import { useAnnualStatusOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-annual-status-options-query";
import {
  useCreateAnnualGradeMutation,
  useDeleteAnnualGradeMutation,
  useLockAnnualGradeMutation,
  useUnlockAnnualGradeMutation,
  useUpdateAnnualGradeMutation,
} from "@/features/grade-aggregation/annual-grades/hooks/use-annual-grades-mutations";
import { useAnnualGradesQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-annual-grades-query";
import { useAcademicYearOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-term-options-query";
import { useSectionOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-subject-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { toStudentEnrollmentPickerOption, type StudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";
import type { AnnualGradeListItem, GradingWorkflowStatus } from "@/lib/api/client";

type FormState = {
  academicYearId: string;
  sectionId: string;
  subjectId: string;
  studentEnrollmentId: string;
  semester1Total: string;
  semester2Total: string;
  useTermTotals: boolean;
  termTotals: Record<string, string>;
  annualPercentage: string;
  finalStatusId: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  sectionId: "",
  subjectId: "",
  studentEnrollmentId: "",
  semester1Total: "",
  semester2Total: "",
  useTermTotals: false,
  termTotals: {},
  annualPercentage: "",
  finalStatusId: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
};

function toFormState(item: AnnualGradeListItem): FormState {
  const termTotals: Record<string, string> = {};
  if (item.termTotals?.length > 0) {
    for (const term of item.termTotals) {
      termTotals[term.academicTermId] = String(term.termTotal);
    }
  }
  return {
    academicYearId: item.academicYearId,
    sectionId: item.studentEnrollment.sectionId,
    subjectId: item.subjectId,
    studentEnrollmentId: item.studentEnrollmentId,
    semester1Total: String(item.semester1Total),
    semester2Total: String(item.semester2Total),
    useTermTotals: item.termTotals?.length > 0,
    termTotals,
    annualPercentage: item.annualPercentage === null ? "" : String(item.annualPercentage),
    finalStatusId: item.finalStatusId,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function AnnualGradesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("annual-grades.create");
  const canUpdate = hasPermission("annual-grades.update");
  const canLock = hasPermission("annual-grades.lock");
  const canUnlock = hasPermission("annual-grades.unlock");
  const canDelete = hasPermission("annual-grades.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [finalStatusFilter, setFinalStatusFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all" as any);
  const [lockFilter, setLockFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", section: "all", subject: "all", finalStatus: "all", status: "all", lock: "all", active: "all" });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<StudentEnrollmentPickerOption | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const academicTermsQuery = useAcademicTermOptionsQuery(form.academicYearId || undefined);
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const annualStatusesQuery = useAnnualStatusOptionsQuery();
  const annualGradesQuery = useAnnualGradesQuery({
    page, limit: PAGE_SIZE, search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    finalStatusId: finalStatusFilter === "all" ? undefined : finalStatusFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isLocked: lockFilter === "all" ? undefined : lockFilter === "locked",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateAnnualGradeMutation();
  const updateMutation = useUpdateAnnualGradeMutation();
  const lockMutation = useLockAnnualGradeMutation();
  const unlockMutation = useUnlockAnnualGradeMutation();
  const deleteMutation = useDeleteAnnualGradeMutation();

  const records = React.useMemo(() => annualGradesQuery.data?.data ?? [], [annualGradesQuery.data?.data]);
  const pagination = annualGradesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const academicTermOptions = academicTermsQuery.data ?? [];

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, section: sectionFilter, subject: subjectFilter, finalStatus: finalStatusFilter, status: statusFilter, lock: lockFilter, active: activeFilter });
  }, [activeFilter, finalStatusFilter, isFilterOpen, lockFilter, sectionFilter, statusFilter, subjectFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setSelectedEnrollment(null);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: AnnualGradeListItem) => {
    if (!canUpdate || item.isLocked) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setSelectedEnrollment(toStudentEnrollmentPickerOption(item.studentEnrollment));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicYearId || !form.studentEnrollmentId || !form.subjectId || !form.finalStatusId) {
      setFormError("السنة، الطالب، المادة، وحالة النتيجة حقول إجبارية.");
      return;
    }

    const termTotalsPayload = form.useTermTotals
      ? Object.entries(form.termTotals)
          .filter(([_, val]) => val !== "")
          .map(([id, val]) => ({ academicTermId: id, termTotal: Number(val) }))
      : undefined;

    const payload = {
      semester1Total: form.useTermTotals ? undefined : Number(form.semester1Total),
      semester2Total: form.useTermTotals ? undefined : Number(form.semester2Total),
      termTotals: termTotalsPayload,
      annualPercentage: form.annualPercentage ? Number(form.annualPercentage) : undefined,
      finalStatusId: form.finalStatusId,
      status: form.status,
      notes: form.notes || undefined,
      isActive: form.isActive
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ annualGradeId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate({
        ...payload,
        academicYearId: form.academicYearId,
        studentEnrollmentId: form.studentEnrollmentId,
        subjectId: form.subjectId,
      }, { onSuccess: resetFormState });
    }
  };

  const handleToggleLock = (item: AnnualGradeListItem) => {
    if (item.isLocked) {
      if (canUnlock) unlockMutation.mutate(item.id);
    } else {
      if (canLock) lockMutation.mutate(item.id);
    }
  };

  const handleDelete = (item: AnnualGradeListItem) => {
    if (!canDelete || item.isLocked || !window.confirm(`حذف سجل الدرجة السنوية للطالب ${item.studentEnrollment.student.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setFinalStatusFilter(filterDraft.finalStatus);
    setStatusFilter(filterDraft.status);
    setLockFilter(filterDraft.lock);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setFinalStatusFilter("all");
    setStatusFilter("all" as any);
    setLockFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", section: "all", subject: "all", finalStatus: "all", status: "all", lock: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      finalStatusFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      lockFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, finalStatusFilter, lockFilter, searchInput, sectionFilter, statusFilter, subjectFilter, yearFilter]);

  return (
    <PageShell
      title="النتائج والدرجات السنوية"
      subtitle="إدارة الحصاد الختامي لدرجات الطلاب، تحديد حالات الترفيع والرسوب، ومراجعة النسب المئوية السنوية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث عن طالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void annualGradesQuery.refetch()} disabled={annualGradesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${annualGradesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفرز والبحث"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">السنة الدراسية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">النتيجة النهائية</label>
              <SelectField value={filterDraft.finalStatus} onChange={(e) => setFilterDraft(p => ({ ...p, finalStatus: e.target.value }))}>
                <option value="all">كل الحالات</option>
                {(annualStatusesQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">حالة القفل</label>
              <SelectField value={filterDraft.lock} onChange={(e) => setFilterDraft(p => ({ ...p, lock: e.target.value }))}>
                <option value="all">الكل</option>
                <option value="locked">مقفل</option>
                <option value="unlocked">مفتوح</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Trophy className="h-5 w-5 text-primary" />
                سجل الحصاد السنوي
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {annualGradesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل كشوف النتائج السنوية...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.studentEnrollment.student.fullName}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <BookOpen className="h-3 w-3" />
                        <span>{item.subject.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={item.isLocked ? "secondary" : "default"} className="h-5 text-[8px] font-bold uppercase gap-1">
                        {item.isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                        {item.isLocked ? "مقفل" : "مفتوح"}
                      </Badge>
                      <Badge variant="outline" className={`h-5 text-[8px] font-bold uppercase ${item.finalStatus.code === 'PASS' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-destructive/20 bg-destructive/5 text-destructive'}`}>
                        {item.finalStatus.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-primary/5 p-3 flex flex-col items-center justify-center space-y-1">
                      <span className="text-[10px] uppercase text-primary/70 font-bold leading-none">النسبة</span>
                      <span className="text-xl font-black text-primary">{item.annualPercentage ?? "0"}%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2 space-y-0.5">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none">متوسط الفصلين</span>
                        <div className="text-[11px] font-bold flex items-center gap-1">
                          <Activity className="h-3 w-3 text-sky-500" />
                          <span>{((item.semester1Total + item.semester2Total) / 2).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2 space-y-0.5">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none">مجموع السنوي</span>
                        <div className="text-[11px] font-bold flex items-center gap-1">
                          <BarChart3 className="h-3 w-3 text-amber-500" />
                          <span>{item.annualTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground px-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{item.academicYear.name}</span>
                    <span className="mx-1">•</span>
                    <Layout className="h-3 w-3" />
                    <span>{item.studentEnrollment.section.name}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg border-border/60 hover:border-primary/50 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || item.isLocked}
                    >
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-amber-600 hover:bg-amber-50" onClick={() => handleToggleLock(item)} disabled={item.isLocked ? !canUnlock : !canLock}>
                      {item.isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || item.isLocked}
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة سجل" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل سجل الدرجات السنوية" : "إضافة نتيجة سنوية يدوية"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> المعلومات الأكاديمية</h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الدراسية *</label>
                  <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, studentEnrollmentId: "", termTotals: {}, useTermTotals: false }))} disabled={isEditing}>
                    <option value="">اختر السنة</option>
                    {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الشعبة الدراسية *</label>
                  <SelectField value={form.sectionId} onChange={(e) => setForm(p => ({ ...p, sectionId: e.target.value, studentEnrollmentId: "" }))} disabled={isEditing}>
                    <option value="">اختر الشعبة</option>
                    {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
                  </SelectField>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> الطالب *</label>
                <StudentEnrollmentPickerSheet
                  value={form.studentEnrollmentId}
                  selectedOption={selectedEnrollment}
                  onSelect={(opt) => {
                    setSelectedEnrollment(opt);
                    setForm(p => ({ ...p, studentEnrollmentId: opt?.id ?? "" }));
                  }}
                  scope="grade-aggregation-annual-grades"
                  variant="form"
                  academicYearId={form.academicYearId || undefined}
                  sectionId={form.sectionId || undefined}
                  placeholder="ابحث عن طالب..."
                  disabled={isEditing}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المادة الدراسية *</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))} disabled={isEditing}>
                  <option value="">اختر المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> سجل النتائج</h4>
              <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">
                <input type="checkbox" checked={form.useTermTotals} onChange={(e) => setForm(p => ({ ...p, useTermTotals: e.target.checked, termTotals: e.target.checked ? academicTermOptions.reduce((acc: any, t) => { acc[t.id] = ""; return acc; }, {}) : {} }))} className="h-3 w-3 rounded text-primary" />
                استخدام فصول متعددة
              </label>
            </div>
            
            <div className="grid gap-4">
              {form.useTermTotals ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {academicTermOptions.map(term => (
                    <div key={term.id} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">مجموع {term.name}</label>
                      <Input type="number" value={form.termTotals[term.id] || ""} onChange={(e) => setForm(p => ({ ...p, termTotals: { ...p.termTotals, [term.id]: e.target.value } }))} placeholder="0.00" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">مجموع الفصل الأول</label>
                    <Input type="number" value={form.semester1Total} onChange={(e) => setForm(p => ({ ...p, semester1Total: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">مجموع الفصل الثاني</label>
                    <Input type="number" value={form.semester2Total} onChange={(e) => setForm(p => ({ ...p, semester2Total: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
              )}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none">النسبة المئوية السنوية (%)</label>
                <div className="relative">
                  <Input type="number" className="pl-8" value={form.annualPercentage} onChange={(e) => setForm(p => ({ ...p, annualPercentage: e.target.value }))} placeholder="أدخل النسبة..." />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> الإجراء والاعتماد</h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">النتيجة النهائية *</label>
                  <SelectField value={form.finalStatusId} onChange={(e) => setForm(p => ({ ...p, finalStatusId: e.target.value }))}>
                    <option value="">حدد حالة النتيجة</option>
                    {(annualStatusesQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة المراجعة</label>
                  <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                    <option value="DRAFT">مسودة</option>
                    <option value="IN_REVIEW">قيد المراجعة</option>
                    <option value="APPROVED">معتمد نهائي</option>
                  </SelectField>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">توجيهات أو ملاحظات</label>
                <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أدخل أسباب القرار أو ملاحظات..." />
              </div>
              <label className="flex items-center justify-between px-3 py-2 bg-background/50 rounded-xl border border-border/50 transition-colors hover:bg-background/80 cursor-pointer">
                <span className="text-sm font-bold">تفعيل السجل في الكشوفات</span>
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

"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Calculator,
  Lock,
  LockOpen,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  CalendarDays,
  Activity,
  User,
  BookOpen,
  GraduationCap,
  Info,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Layout,
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
import {
  useCalculateMonthlyGradesMutation,
  useCreateMonthlyGradeMutation,
  useDeleteMonthlyGradeMutation,
  useLockMonthlyGradeMutation,
  useUnlockMonthlyGradeMutation,
  useUpdateMonthlyGradeMutation,
} from "@/features/grade-aggregation/monthly-grades/hooks/use-monthly-grades-mutations";
import { useMonthlyGradesQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-monthly-grades-query";
import { useAcademicMonthOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-academic-month-options-query";
import { useSectionOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-subject-options-query";
import {
  toStudentEnrollmentPickerOption,
  type StudentEnrollmentPickerOption,
} from "@/features/students/lib/student-enrollment-picker";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type { GradingWorkflowStatus, MonthlyGradeListItem } from "@/lib/api/client";

type FormState = {
  academicMonthId: string;
  sectionId: string;
  subjectId: string;
  studentEnrollmentId: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

type CalculateFormState = {
  academicMonthId: string;
  sectionId: string;
  subjectId: string;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  academicMonthId: "",
  sectionId: "",
  subjectId: "",
  studentEnrollmentId: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
};

const DEFAULT_CALC_FORM: CalculateFormState = {
  academicMonthId: "",
  sectionId: "",
  subjectId: "",
};

function toFormState(item: MonthlyGradeListItem): FormState {
  return {
    academicMonthId: item.academicMonthId,
    sectionId: item.studentEnrollment.sectionId,
    subjectId: item.subjectId,
    studentEnrollmentId: item.studentEnrollmentId,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function MonthlyGradesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("monthly-grades.create");
  const canUpdate = hasPermission("monthly-grades.update");
  const canCalculate = hasPermission("monthly-grades.calculate");
  const canLock = hasPermission("monthly-grades.lock");
  const canUnlock = hasPermission("monthly-grades.unlock");
  const canDelete = hasPermission("monthly-grades.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ month: "all", section: "all", subject: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcForm, setCalcForm] = React.useState<CalculateFormState>(DEFAULT_CALC_FORM);
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<StudentEnrollmentPickerOption | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [calcResult, setCalcResult] = React.useState<{ message: string, type: 'success' | 'info' } | null>(null);

  const monthsQuery = useAcademicMonthOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const monthlyGradesQuery = useMonthlyGradesQuery({
    page, limit: PAGE_SIZE, search: search || undefined,
    academicMonthId: monthFilter === "all" ? undefined : monthFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateMonthlyGradeMutation();
  const updateMutation = useUpdateMonthlyGradeMutation();
  const calculateMutation = useCalculateMonthlyGradesMutation();
  const lockMutation = useLockMonthlyGradeMutation();
  const unlockMutation = useUnlockMonthlyGradeMutation();
  const deleteMutation = useDeleteMonthlyGradeMutation();

  const records = React.useMemo(() => monthlyGradesQuery.data?.data ?? [], [monthlyGradesQuery.data?.data]);
  const pagination = monthlyGradesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending || calculateMutation.isPending;

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

  const handleStartEdit = (item: MonthlyGradeListItem) => {
    if (!canUpdate || item.isLocked) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setSelectedEnrollment(toStudentEnrollmentPickerOption(item.studentEnrollment));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicMonthId || !form.studentEnrollmentId || !form.subjectId) {
      setFormError("الشهر، الطالب، والمادة حقول إجبارية.");
      return;
    }

    if (isEditing && editingId) {
      updateMutation.mutate({
        monthlyGradeId: editingId,
        payload: { status: form.status, notes: form.notes || undefined, isActive: form.isActive }
      }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate({
        academicMonthId: form.academicMonthId,
        studentEnrollmentId: form.studentEnrollmentId,
        subjectId: form.subjectId,
        notes: form.notes || undefined,
        isActive: form.isActive
      }, { onSuccess: resetFormState });
    }
  };

  const handleCalculate = () => {
    if (!calcForm.academicMonthId || !calcForm.sectionId || !calcForm.subjectId) {
      setCalcResult({ message: "يرجى تحديد الشهر، الشعبة، والمادة للاحتساب.", type: 'info' });
      return;
    }
    calculateMutation.mutate(calcForm, {
      onSuccess: (res) => {
        setCalcResult({
          message: `تم الاحتساب بنجاح: ${res.summary.created} جديد، ${res.summary.updated} تم تحديثه.`,
          type: 'success'
        });
        void monthlyGradesQuery.refetch();
      }
    });
  };

  const handleToggleLock = (item: MonthlyGradeListItem) => {
    if (item.isLocked) {
      if (canUnlock) unlockMutation.mutate(item.id);
    } else {
      if (canLock) lockMutation.mutate(item.id);
    }
  };

  const handleDelete = (item: MonthlyGradeListItem) => {
    if (!canDelete || item.isLocked || !window.confirm(`حذف إجمالي الدرجة الشهرية للطالب ${item.studentEnrollment.student.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
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

  return (
    <PageShell
      title="تجميع الدرجات الشهرية"
      subtitle="إدارة واحتساب إجماليات الدرجات الشهرية بناءً على التقييمات المسجلة للطلاب في كل مادة."
    >
      <div className="space-y-4">
        {/* Quick Calculate Toolbar */}
        <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Calculator className="h-4 w-4" />
              <span>احتساب سريع:</span>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <SelectField className="h-8 text-[11px]" value={calcForm.academicMonthId} onChange={(e) => setCalcForm(p => ({ ...p, academicMonthId: e.target.value }))}>
                <option value="">اختر الشهر</option>
                {(monthsQuery.data ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </SelectField>
              <SelectField className="h-8 text-[11px]" value={calcForm.sectionId} onChange={(e) => setCalcForm(p => ({ ...p, sectionId: e.target.value }))}>
                <option value="">اختر الشعبة</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
              </SelectField>
              <SelectField className="h-8 text-[11px]" value={calcForm.subjectId} onChange={(e) => setCalcForm(p => ({ ...p, subjectId: e.target.value }))}>
                <option value="">اختر المادة</option>
                {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
            </div>
            <Button size="sm" className="h-8 gap-1.5 font-bold" onClick={handleCalculate} disabled={calculateMutation.isPending}>
              {calculateMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
              بدء الاحتساب
            </Button>
          </CardContent>
          {calcResult && (
            <div className={`px-4 pb-3 flex items-center justify-between text-[11px] font-bold ${calcResult.type === 'success' ? 'text-emerald-600' : 'text-primary'}`}>
              <span className="flex items-center gap-1.5">
                {calcResult.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {calcResult.message}
              </span>
              <button className="underline decoration-dotted" onClick={() => setCalcResult(null)}>إخفاء</button>
            </div>
          )}
        </Card>

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الطالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void monthlyGradesQuery.refetch()} disabled={monthlyGradesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${monthlyGradesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الدرجات"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الشهر الأكاديمي</label>
              <SelectField value={filterDraft.month} onChange={(e) => setFilterDraft(p => ({ ...p, month: e.target.value }))}>
                <option value="all">كل الأشهر</option>
                {(monthsQuery.data ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الشعبة</label>
              <SelectField value={filterDraft.section} onChange={(e) => setFilterDraft(p => ({ ...p, section: e.target.value }))}>
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
                سجل الدرجات الشهرية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {monthlyGradesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل سجلات الدرجات...
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
                      <Badge variant="outline" className="h-5 text-[8px] font-bold uppercase border-slate-200 bg-slate-50 text-slate-700">
                        {translateGradingWorkflowStatus(item.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-primary/5 p-3 flex flex-col items-center justify-center space-y-1">
                      <span className="text-[10px] uppercase text-primary/70 font-bold leading-none">الإجمالي</span>
                      <span className="text-xl font-black text-primary">{item.monthlyTotal}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2 space-y-0.5">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none">تلقائي</span>
                        <div className="text-[11px] font-bold flex items-center gap-1">
                          <Activity className="h-3 w-3 text-emerald-500" />
                          <span>{item.periodGradeComponents.length} قيم</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2 space-y-0.5">
                        <span className="text-[8px] uppercase text-muted-foreground font-bold leading-none">يدوي</span>
                        <div className="text-[11px] font-bold flex items-center gap-1">
                          <Settings2 className="h-3 w-3 text-amber-500" />
                          <span>{item.customComponentScores.length} قيم</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground px-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>فبراير 2024</span>
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة درجة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل بيانات الدرجة الشهرية" : "إضافة سجل درجة شهرية يدوياً"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> التفاصيل الأكاديمية</h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الشهر الدراسي *</label>
                  <SelectField value={form.academicMonthId} onChange={(e) => setForm(p => ({ ...p, academicMonthId: e.target.value, studentEnrollmentId: "" }))} disabled={isEditing}>
                    <option value="">اختر الشهر</option>
                    {(monthsQuery.data ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المادة الدراسية *</label>
                  <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))} disabled={isEditing}>
                    <option value="">اختر المادة</option>
                    {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                  scope="grade-aggregation-monthly-grades"
                  variant="form"
                  placeholder="ابحث عن طالب..."
                  disabled={isEditing}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> الحالة والاعتماد</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة المراجعة</label>
                <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  <option value="DRAFT">مسودة</option>
                  <option value="APPROVED">معتمد</option>
                  <option value="REJECTED">مرفوض</option>
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> ملاحظات أو تبرير</label>
                <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="سبب التعديل اليدوي إن وُجد..." />
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/30">
            <span className="font-bold">سجل نشط في التقارير</span>
            <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
          </label>

          {isEditing && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex gap-3 text-xs text-blue-800 leading-relaxed">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
              <p>يتم احتساب إجمالي الدرجة تلقائياً بناءً على مكوّنات الشهر. استخدم التعديل لتغيير الحالة أو إضافة ملاحظات فقط.</p>
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

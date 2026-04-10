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
  FileCheck,
  Zap,
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
import { useSectionOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-subject-options-query";
import {
  useCalculateSemesterGradesMutation,
  useCreateSemesterGradeMutation,
  useDeleteSemesterGradeMutation,
  useFillSemesterFinalExamScoresMutation,
  useLockSemesterGradeMutation,
  useUnlockSemesterGradeMutation,
  useUpdateSemesterGradeMutation,
} from "@/features/grade-aggregation/semester-grades/hooks/use-semester-grades-mutations";
import { useAcademicTermOptionsQuery } from "@/features/grade-aggregation/semester-grades/hooks/use-academic-term-options-query";
import { useSemesterGradesQuery } from "@/features/grade-aggregation/semester-grades/hooks/use-semester-grades-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { toStudentEnrollmentPickerOption, type StudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";
import type { GradingWorkflowStatus, SemesterGradeListItem } from "@/lib/api/client";

type FormState = {
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  studentEnrollmentId: string;
  semesterWorkTotal: string;
  finalExamScore: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

type ActionFormState = {
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  overwrite: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  academicTermId: "",
  sectionId: "",
  subjectId: "",
  studentEnrollmentId: "",
  semesterWorkTotal: "",
  finalExamScore: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
};

const DEFAULT_ACTION_FORM: ActionFormState = {
  academicTermId: "",
  sectionId: "",
  subjectId: "",
  overwrite: false,
};

function toFormState(item: SemesterGradeListItem): FormState {
  return {
    academicTermId: item.academicTermId,
    sectionId: item.studentEnrollment.sectionId,
    subjectId: item.subjectId,
    studentEnrollmentId: item.studentEnrollmentId,
    semesterWorkTotal: String(item.semesterWorkTotal),
    finalExamScore: item.finalExamScore === null ? "" : String(item.finalExamScore),
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function SemesterGradesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("semester-grades.create");
  const canUpdate = hasPermission("semester-grades.update");
  const canCalculate = hasPermission("semester-grades.calculate");
  const canLock = hasPermission("semester-grades.lock");
  const canUnlock = hasPermission("semester-grades.unlock");
  const canDelete = hasPermission("semester-grades.delete");
  const canFillFinal = hasPermission("semester-grades.fill-final-exam");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [termFilter, setTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ term: "all", section: "all", subject: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcForm, setCalcForm] = React.useState<ActionFormState>(DEFAULT_ACTION_FORM);
  const [fillForm, setFillForm] = React.useState<ActionFormState>(DEFAULT_ACTION_FORM);
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<StudentEnrollmentPickerOption | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionResult, setActionResult] = React.useState<{ message: string, type: 'success' | 'info' } | null>(null);

  const termsQuery = useAcademicTermOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const semesterGradesQuery = useSemesterGradesQuery({
    page, limit: PAGE_SIZE, search: search || undefined,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateSemesterGradeMutation();
  const updateMutation = useUpdateSemesterGradeMutation();
  const calculateMutation = useCalculateSemesterGradesMutation();
  const fillMutation = useFillSemesterFinalExamScoresMutation();
  const lockMutation = useLockSemesterGradeMutation();
  const unlockMutation = useUnlockSemesterGradeMutation();
  const deleteMutation = useDeleteSemesterGradeMutation();

  const records = React.useMemo(() => semesterGradesQuery.data?.data ?? [], [semesterGradesQuery.data?.data]);
  const pagination = semesterGradesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending || calculateMutation.isPending || fillMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ term: termFilter, section: sectionFilter, subject: subjectFilter, active: activeFilter });
  }, [activeFilter, isFilterOpen, termFilter, sectionFilter, subjectFilter]);

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

  const handleStartEdit = (item: SemesterGradeListItem) => {
    if (!canUpdate || item.isLocked) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setSelectedEnrollment(toStudentEnrollmentPickerOption(item.studentEnrollment));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicTermId || !form.studentEnrollmentId || !form.subjectId) {
      setFormError("الفصل، الطالب، والمادة حقول إجبارية.");
      return;
    }

    const payload = {
      semesterWorkTotal: Number(form.semesterWorkTotal),
      finalExamScore: form.finalExamScore ? Number(form.finalExamScore) : undefined,
      status: form.status,
      notes: form.notes || undefined,
      isActive: form.isActive
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ semesterGradeId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate({
        ...payload,
        academicTermId: form.academicTermId,
        studentEnrollmentId: form.studentEnrollmentId,
        subjectId: form.subjectId,
      }, { onSuccess: resetFormState });
    }
  };

  const handleOperation = (type: 'calc' | 'fill') => {
    const data = type === 'calc' ? calcForm : fillForm;
    if (!data.academicTermId || !data.sectionId || !data.subjectId) {
      setActionResult({ message: "يرجى تحديد المعايير كاملة للعملية.", type: 'info' });
      return;
    }

    if (type === 'calc') {
      calculateMutation.mutate({ 
        academicTermId: calcForm.academicTermId, 
        sectionId: calcForm.sectionId, 
        subjectId: calcForm.subjectId, 
        overwriteManual: calcForm.overwrite 
      }, {
        onSuccess: (res) => {
          setActionResult({ message: `تم الاحتساب: ${res.summary.created} جديد، ${res.summary.updated} مُحدث.`, type: 'success' });
          void semesterGradesQuery.refetch();
        }
      });
    } else {
      fillMutation.mutate({ 
        academicTermId: fillForm.academicTermId, 
        sectionId: fillForm.sectionId, 
        subjectId: fillForm.subjectId, 
        overwriteExisting: fillForm.overwrite 
      }, {
        onSuccess: (res) => {
          setActionResult({ message: `تمت التعبئة: ${res.summary.updated} تم تحديث درجاتهم النهائية.`, type: 'success' });
          void semesterGradesQuery.refetch();
        }
      });
    }
  };

  const handleToggleLock = (item: SemesterGradeListItem) => {
    if (item.isLocked) {
      if (canUnlock) unlockMutation.mutate(item.id);
    } else {
      if (canLock) lockMutation.mutate(item.id);
    }
  };

  const handleDelete = (item: SemesterGradeListItem) => {
    if (!canDelete || item.isLocked || !window.confirm(`حذف سجل الدرجة الفصلية للطالب ${item.studentEnrollment.student.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setTermFilter(filterDraft.term);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setTermFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setActiveFilter("all");
    setFilterDraft({ term: "all", section: "all", subject: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, termFilter, searchInput, sectionFilter, subjectFilter]);

  const selectedTermForForm = (termsQuery.data ?? []).find(it => it.id === form.academicTermId);

  return (
    <PageShell
      title="تجميع الدرجات الفصلية"
      subtitle="إدارة المجاميع النهائية للفصل الدراسي، رصد الاختبارات النهائية، واعتماد النتائج للمواد المختلفة."
    >
      <div className="space-y-4">
        {/* Bulk Operations Panel */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-primary/10">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Calculator className="h-4 w-4" />
                <span>احتساب أعمال الفصل</span>
              </div>
              <Badge variant="outline" className="text-[9px] h-4 border-primary/20 text-primary">آلي</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <SelectField className="h-8 text-[10px]" value={calcForm.academicTermId} onChange={(e) => setCalcForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">الفصل</option>
                  {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
                <SelectField className="h-8 text-[10px]" value={calcForm.sectionId} onChange={(e) => setCalcForm(p => ({ ...p, sectionId: e.target.value }))}>
                  <option value="">الشعبة</option>
                  {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
                </SelectField>
                <SelectField className="h-8 text-[10px]" value={calcForm.subjectId} onChange={(e) => setCalcForm(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={calcForm.overwrite} onChange={(e) => setCalcForm(p => ({ ...p, overwrite: e.target.checked }))} className="h-3 w-3 rounded text-primary" />
                  استبدال الدرجات اليدوية
                </label>
                <Button size="sm" className="h-7 px-4 font-bold text-[10px]" onClick={() => handleOperation('calc')} disabled={calculateMutation.isPending}>
                  {calculateMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                  ابدأ المعالجة
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky/20 bg-sky-500/5 backdrop-blur-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-sky-500/10">
              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                <Medal className="h-4 w-4" />
                <span>تعبئة درجات النهائي</span>
              </div>
              <Badge variant="outline" className="text-[9px] h-4 border-sky-500/20 text-sky-600 font-bold uppercase">Fill</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <SelectField className="h-8 text-[10px]" value={fillForm.academicTermId} onChange={(e) => setFillForm(p => ({ ...p, academicTermId: e.target.value }))}>
                  <option value="">الفصل</option>
                  {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
                <SelectField className="h-8 text-[10px]" value={fillForm.sectionId} onChange={(e) => setFillForm(p => ({ ...p, sectionId: e.target.value }))}>
                  <option value="">الشعبة</option>
                  {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
                </SelectField>
                <SelectField className="h-8 text-[10px]" value={fillForm.subjectId} onChange={(e) => setFillForm(p => ({ ...p, subjectId: e.target.value }))}>
                  <option value="">المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={fillForm.overwrite} onChange={(e) => setFillForm(p => ({ ...p, overwrite: e.target.checked }))} className="h-3 w-3 rounded text-sky-500" />
                  تجاوز القيم الحالية
                </label>
                <Button size="sm" variant="outline" className="h-7 px-4 font-bold text-[10px] border-sky-200 text-sky-700 hover:bg-sky-50" onClick={() => handleOperation('fill')} disabled={fillMutation.isPending}>
                  {fillMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3 w-3" />}
                  تصدير الدرجات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {actionResult && (
          <div className={`px-4 py-2 rounded-xl flex items-center justify-between text-xs font-bold border ${actionResult.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-primary/20 bg-primary/5 text-primary'}`}>
            <span className="flex items-center gap-2">
              {actionResult.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {actionResult.message}
            </span>
            <button className="h-6 w-6 rounded-full hover:bg-black/5 flex items-center justify-center" onClick={() => setActionResult(null)}>×</button>
          </div>
        )}

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث عن طالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void semesterGradesQuery.refetch()} disabled={semesterGradesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${semesterGradesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الدرجات الفصلية"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الفصل الأكاديمي</label>
              <SelectField value={filterDraft.term} onChange={(e) => setFilterDraft(p => ({ ...p, term: e.target.value }))}>
                <option value="all">كل الفصول</option>
                {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                سجل النتائج الفصلية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {semesterGradesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل كشوف النتائج...
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

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2 space-y-0.5 text-center">
                      <span className="text-[7px] uppercase text-muted-foreground font-bold leading-none">الأعمال</span>
                      <div className="text-xs font-black">{item.semesterWorkTotal}</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2 space-y-0.5 text-center">
                      <span className="text-[7px] uppercase text-muted-foreground font-bold leading-none">النهائي</span>
                      <div className="text-xs font-black">{item.finalExamScore ?? "-"}</div>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 space-y-0.5 text-center">
                      <span className="text-[7px] uppercase text-primary font-bold leading-none">الإجمالي</span>
                      <div className="text-xs font-black text-primary">{item.semesterTotal}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground px-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{item.academicTerm.name}</span>
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

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة نتيجة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل سجل النتيجة الفصلية" : "إضافة نتيجة فصلية يدوية"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> النطاق الأكاديمي</h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الفصل الدراسي *</label>
                  <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value, studentEnrollmentId: "" }))} disabled={isEditing}>
                    <option value="">اختر الفصل</option>
                    {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المادة الدراسية *</label>
                <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))} disabled={isEditing}>
                  <option value="">اختر المادة</option>
                  {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> الطالب المستهدف *</label>
                <StudentEnrollmentPickerSheet
                  value={form.studentEnrollmentId}
                  selectedOption={selectedEnrollment}
                  onSelect={(opt) => {
                    setSelectedEnrollment(opt);
                    setForm(p => ({ ...p, studentEnrollmentId: opt?.id ?? "" }));
                  }}
                  scope="grade-aggregation-semester-grades"
                  variant="form"
                  academicYearId={selectedTermForForm?.academicYearId}
                  sectionId={form.sectionId || undefined}
                  placeholder="ابحث عن نتيجة طالب..."
                  disabled={isEditing}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Medal className="h-3.5 w-3.5" /> توزيع الدرجات</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">مجموع أعمال الفصل</label>
                <Input type="number" value={form.semesterWorkTotal} onChange={(e) => setForm(p => ({ ...p, semesterWorkTotal: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">درجة الاختبار النهائي</label>
                <Input type="number" value={form.finalExamScore} onChange={(e) => setForm(p => ({ ...p, finalExamScore: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> الحالة والملاحظات</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة المراجعة والاعتماد</label>
                <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  <option value="DRAFT">مسودة</option>
                  <option value="IN_REVIEW">قيد المراجعة</option>
                  <option value="APPROVED">معتمد نهائي</option>
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> ملاحظات إضافية</label>
                <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات حول صحة الرصد..." />
              </div>
              <label className="flex items-center justify-between px-3 py-1 text-sm bg-background/50 rounded-xl border border-border/50">
                <span className="font-bold">تضمين في التقارير النهائية</span>
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

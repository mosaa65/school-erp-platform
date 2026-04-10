"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarCheck2,
  Lock,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Medal,
  Clock,
  Info,
  ChevronLeft,
  Settings2,
  GraduationCap,
  ShieldCheck,
  Ban,
  CircleHelp,
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
  useCreateStudentExamScoreMutation,
  useDeleteStudentExamScoreMutation,
  useUpdateStudentExamScoreMutation,
} from "@/features/exams/student-exam-scores/hooks/use-student-exam-scores-mutations";
import { useExamAssessmentOptionsQuery } from "@/features/exams/student-exam-scores/hooks/use-exam-assessment-options-query";
import { useExamPeriodOptionsQuery } from "@/features/exams/student-exam-scores/hooks/use-exam-period-options-query";
import { useStudentExamScoresQuery } from "@/features/exams/student-exam-scores/hooks/use-student-exam-scores-query";
import {
  toStudentEnrollmentPickerOption,
  type StudentEnrollmentPickerOption,
} from "@/features/students/lib/student-enrollment-picker";
import {
  translateAssessmentType,
  translateExamAbsenceType,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type {
  ExamAbsenceType,
  StudentEnrollmentListItem,
  StudentExamScoreListItem,
} from "@/lib/api/client";

type FormState = {
  examPeriodId: string;
  examAssessmentId: string;
  studentEnrollmentId: string;
  isPresent: boolean;
  score: string;
  absenceType: ExamAbsenceType;
  excuseDetails: string;
  teacherNotes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  examPeriodId: "",
  examAssessmentId: "",
  studentEnrollmentId: "",
  isPresent: true,
  score: "0",
  absenceType: "UNEXCUSED",
  excuseDetails: "",
  teacherNotes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: StudentExamScoreListItem): FormState {
  return {
    examPeriodId: item.examAssessment.examPeriod.id,
    examAssessmentId: item.examAssessmentId,
    studentEnrollmentId: item.studentEnrollmentId,
    isPresent: item.isPresent,
    score: String(item.score),
    absenceType: item.absenceType ?? "UNEXCUSED",
    excuseDetails: item.excuseDetails ?? "",
    teacherNotes: item.teacherNotes ?? "",
    isActive: item.isActive,
  };
}

export function StudentExamScoresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-exam-scores.create");
  const canUpdate = hasPermission("student-exam-scores.update");
  const canDelete = hasPermission("student-exam-scores.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [assessmentFilter, setAssessmentFilter] = React.useState("all");
  const [presenceFilter, setPresenceFilter] = React.useState<"all" | "present" | "absent">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ period: "all", assessment: "all", presence: "all" as any, active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<StudentEnrollmentPickerOption | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const periodsQuery = useExamPeriodOptionsQuery();
  const assessmentsQuery = useExamAssessmentOptionsQuery(form.examPeriodId || undefined);
  const filterAssessmentsQuery = useExamAssessmentOptionsQuery(filterDraft.period === "all" ? undefined : filterDraft.period);
  
  const scoresQuery = useStudentExamScoresQuery({
    page, limit: PAGE_SIZE, search: search || undefined,
    examPeriodId: periodFilter === "all" ? undefined : periodFilter,
    examAssessmentId: assessmentFilter === "all" ? undefined : assessmentFilter,
    isPresent: presenceFilter === "all" ? undefined : presenceFilter === "present",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateStudentExamScoreMutation();
  const updateMutation = useUpdateStudentExamScoreMutation();
  const deleteMutation = useDeleteStudentExamScoreMutation();

  const records = React.useMemo(() => scoresQuery.data?.data ?? [], [scoresQuery.data?.data]);
  const pagination = scoresQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const selectedAssessment = (assessmentsQuery.data ?? []).find(it => it.id === form.examAssessmentId);

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ period: periodFilter, assessment: assessmentFilter, presence: presenceFilter, active: activeFilter });
  }, [activeFilter, assessmentFilter, isFilterOpen, periodFilter, presenceFilter]);

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

  const handleStartEdit = (item: StudentExamScoreListItem) => {
    if (!canUpdate || item.examAssessment.examPeriod.isLocked) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setSelectedEnrollment(toStudentEnrollmentPickerOption(item.studentEnrollment));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.examAssessmentId || !form.studentEnrollmentId) {
      setFormError("التقييم والطالب حقول إجبارية.");
      return;
    }

    const payload = {
      examAssessmentId: form.examAssessmentId,
      studentEnrollmentId: form.studentEnrollmentId,
      isPresent: form.isPresent,
      score: form.isPresent ? Number(form.score) : 0,
      absenceType: form.isPresent ? undefined : form.absenceType,
      excuseDetails: form.isPresent ? undefined : toOptionalString(form.excuseDetails),
      teacherNotes: toOptionalString(form.teacherNotes),
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ studentExamScoreId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: StudentExamScoreListItem) => {
    if (!canDelete || item.examAssessment.examPeriod.isLocked || !window.confirm(`حذف درجة الطالب ${item.studentEnrollment.student.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setPeriodFilter(filterDraft.period);
    setAssessmentFilter(filterDraft.assessment);
    setPresenceFilter(filterDraft.presence);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setPeriodFilter("all");
    setAssessmentFilter("all");
    setPresenceFilter("all");
    setActiveFilter("all");
    setFilterDraft({ period: "all", assessment: "all", presence: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      periodFilter !== "all" ? 1 : 0,
      assessmentFilter !== "all" ? 1 : 0,
      presenceFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, presenceFilter, searchInput, periodFilter, assessmentFilter]);

  return (
    <PageShell
      title="رصد درجات الاختبارات"
      subtitle="تسجيل وتحرير درجات الطلاب، إثبات الحضور والغياب، وإدارة الأعذار للفترات الاختبارية المفتوحة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالاسم أو الكود..."
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
          title="فلاتر درجات الاختبارات"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">الفترة</label>
              <SelectField value={filterDraft.period} onChange={(e) => setFilterDraft(p => ({ ...p, period: e.target.value, assessment: "all" }))}>
                <option value="all">كل الفترات</option>
                {(periodsQuery.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">التقييم</label>
              <SelectField value={filterDraft.assessment} onChange={(e) => setFilterDraft(p => ({ ...p, assessment: e.target.value }))}>
                <option value="all">كل التقييمات</option>
                {(filterAssessmentsQuery.data ?? []).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CalendarCheck2 className="h-5 w-5 text-primary" />
                سجل رصد الدرجات
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            {scoresQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center font-medium">
                جارٍ تحميل كشوف الدرجات...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.studentEnrollment.student.fullName}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <User className="h-3 w-3" />
                        <span>كود: {item.studentEnrollment.student.admissionNo || "-"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {item.isPresent ? (
                        <Badge variant="default" className="h-5 text-[8px] font-bold bg-emerald-500 hover:bg-emerald-600 gap-1 uppercase">
                          <ShieldCheck className="h-2.5 w-2.5" /> حاضر
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="h-5 text-[8px] font-bold gap-1 uppercase">
                          <Ban className="h-2.5 w-2.5" /> غائب
                        </Badge>
                      )}
                      {item.examAssessment.examPeriod.isLocked && (
                        <Badge variant="secondary" className="h-5 text-[8px] font-bold gap-1 uppercase">
                          <Lock className="h-2.5 w-2.5" /> مقفل
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">الاختبار</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <Medal className="h-3.5 w-3.5 text-primary/70" />
                        <span>{item.score} / {item.examAssessment.maxScore}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">الفصل</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <GraduationCap className="h-3.5 w-3.5 text-sky-600/70" />
                        <span>{item.studentEnrollment.section.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg border-border/60 hover:border-primary/50 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || item.examAssessment.examPeriod.isLocked}
                    >
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || item.examAssessment.examPeriod.isLocked}
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

      <Fab icon={<Plus className="h-5 w-5" />} label="رصد درجة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تعديل درجة الطالب" : "رصد درجة جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> النطاق الاختباري</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">فترة الاختبار *</label>
                <SelectField value={form.examPeriodId} onChange={(e) => setForm(p => ({ ...p, examPeriodId: e.target.value, examAssessmentId: "", studentEnrollmentId: "" }))}>
                  <option value="">اختر الفترة</option>
                  {(periodsQuery.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">التقييم الاختباري المجلد *</label>
                <SelectField value={form.examAssessmentId} onChange={(e) => setForm(p => ({ ...p, examAssessmentId: e.target.value, studentEnrollmentId: "" }))}>
                  <option value="">اختر التقييم</option>
                  {(assessmentsQuery.data ?? []).map(a => <option key={a.id} value={a.id}>{a.title} ({a.section.name})</option>)}
                </SelectField>
              </div>
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
              scope="exams-student-exam-scores"
              variant="form"
              academicYearId={selectedAssessment?.examPeriod.academicYearId}
              sectionId={selectedAssessment?.sectionId ?? undefined}
              placeholder="ابحث عن طالب..."
            />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Medal className="h-3.5 w-3.5" /> نتيجة التقييم</h4>
            <div className="grid gap-4">
              <label className="flex items-center justify-between px-3 py-1 text-sm bg-background rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 ${form.isPresent ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <span className="font-bold">هل الطالب حاضر؟</span>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={form.isPresent} onChange={(e) => setForm(p => ({ ...p, isPresent: e.target.checked, score: e.target.checked ? p.score : "0" }))} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الدرجة المكتسبة</label>
                  <Input type="number" value={form.score} onChange={(e) => setForm(p => ({ ...p, score: e.target.value }))} disabled={!form.isPresent} placeholder="مثال: 45" />
                  {selectedAssessment && <p className="text-[10px] text-muted-foreground font-medium italic">الحد الأقصى: {selectedAssessment.maxScore}</p>}
                </div>
                {!form.isPresent && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase leading-none">نوع الغياب</label>
                    <SelectField value={form.absenceType} onChange={(e) => setForm(p => ({ ...p, absenceType: e.target.value as any }))}>
                      <option value="UNEXCUSED">بدون عذر</option>
                      <option value="EXCUSED">بعذر مقبول</option>
                    </SelectField>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> ملاحظات المعلم</label>
            <Input value={form.teacherNotes} onChange={(e) => setForm(p => ({ ...p, teacherNotes: e.target.value }))} placeholder="سيظهر هذا التقييم في تقارير الطالب..." />
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

"use client";

import * as React from "react";
import {
  CalendarCheck2,
  LoaderCircle,
  Lock,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
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
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateStudentExamScoreMutation,
  useDeleteStudentExamScoreMutation,
  useUpdateStudentExamScoreMutation,
} from "@/features/student-exam-scores/hooks/use-student-exam-scores-mutations";
import { useStudentExamScoresQuery } from "@/features/student-exam-scores/hooks/use-student-exam-scores-query";
import { useExamPeriodOptionsQuery } from "@/features/student-exam-scores/hooks/use-exam-period-options-query";
import { useExamAssessmentOptionsQuery } from "@/features/student-exam-scores/hooks/use-exam-assessment-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/student-exam-scores/hooks/use-student-enrollment-options-query";
import {
  translateAssessmentType,
  translateExamAbsenceType,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type { ExamAbsenceType, StudentExamScoreListItem } from "@/lib/api/client";

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

function getAbsenceTypeLabel(value: ExamAbsenceType): string {
  return translateExamAbsenceType(value);
}

export function StudentExamScoresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-exam-scores.create");
  const canUpdate = hasPermission("student-exam-scores.update");
  const canDelete = hasPermission("student-exam-scores.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [examPeriodFilter, setExamPeriodFilter] = React.useState("all");
  const [assessmentFilter, setAssessmentFilter] = React.useState("all");
  const [presenceFilter, setPresenceFilter] = React.useState<"all" | "present" | "absent">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const examPeriodsQuery = useExamPeriodOptionsQuery();
  const assessmentsForFormQuery = useExamAssessmentOptionsQuery(form.examPeriodId || undefined);
  const assessmentsForFilterQuery = useExamAssessmentOptionsQuery(
    examPeriodFilter === "all" ? undefined : examPeriodFilter,
  );
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery();

  const scoresQuery = useStudentExamScoresQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    examPeriodId: examPeriodFilter === "all" ? undefined : examPeriodFilter,
    examAssessmentId: assessmentFilter === "all" ? undefined : assessmentFilter,
    isPresent: presenceFilter === "all" ? undefined : presenceFilter === "present",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateStudentExamScoreMutation();
  const updateMutation = useUpdateStudentExamScoreMutation();
  const deleteMutation = useDeleteStudentExamScoreMutation();

  const records = scoresQuery.data?.data ?? [];
  const pagination = scoresQuery.data?.pagination;
  const selectedAssessment = (assessmentsForFormQuery.data ?? []).find(
    (item) => item.id === form.examAssessmentId,
  );
  const formEnrollments = React.useMemo(() => {
    const all = enrollmentsQuery.data ?? [];
    if (!selectedAssessment) {
      return all;
    }
    return all.filter(
      (item) =>
        item.sectionId === selectedAssessment.sectionId &&
        item.academicYearId === selectedAssessment.examPeriod.academicYearId,
    );
  }, [enrollmentsQuery.data, selectedAssessment]);

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const resetForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!form.examAssessmentId || !form.studentEnrollmentId) {
      setFormError("الاختبار والقيد مطلوبان.");
      return false;
    }
    if (form.teacherNotes.trim().length > 255 || form.excuseDetails.trim().length > 255) {
      setFormError("ملاحظات المعلم وتفاصيل العذر يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }
    if (!selectedAssessment) {
      setFormError("الاختبار غير صالح.");
      return false;
    }
    if (selectedAssessment.examPeriod.isLocked) {
      setFormError("الفترة الاختبارية مقفلة.");
      return false;
    }

    const selectedEnrollment = (enrollmentsQuery.data ?? []).find(
      (item) => item.id === form.studentEnrollmentId,
    );
    if (!selectedEnrollment) {
      setFormError("قيد الطالب غير صالح.");
      return false;
    }
    if (
      selectedEnrollment.sectionId !== selectedAssessment.sectionId ||
      selectedEnrollment.academicYearId !== selectedAssessment.examPeriod.academicYearId
    ) {
      setFormError("قيد الطالب لا يطابق الشعبة/السنة الخاصة بالاختبار.");
      return false;
    }

    const score = Number(form.score || "0");
    if (!Number.isFinite(score) || score < 0) {
      setFormError("الدرجة يجب أن تكون رقمًا صالحًا أكبر من أو يساوي 0.");
      return false;
    }
    if (form.isPresent && score > selectedAssessment.maxScore) {
      setFormError(`الدرجة يجب ألا تتجاوز ${selectedAssessment.maxScore}.`);
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);
    if (!validateForm()) {
      return;
    }

    const payload = {
      examAssessmentId: form.examAssessmentId,
      studentEnrollmentId: form.studentEnrollmentId,
      isPresent: form.isPresent,
      score: form.isPresent ? Number(form.score || "0") : 0,
      absenceType: form.isPresent ? undefined : form.absenceType,
      excuseDetails: form.isPresent ? undefined : toOptionalString(form.excuseDetails),
      teacherNotes: toOptionalString(form.teacherNotes),
      isActive: form.isActive,
    };

    if (editingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-exam-scores.update.");
        return;
      }
      updateMutation.mutate(
        { studentExamScoreId: editingId, payload },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث درجة الاختبار بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: student-exam-scores.create.");
      return;
    }
    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setActionSuccess("تم إنشاء درجة الاختبار بنجاح.");
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[470px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-primary" />
            {editingId ? "تعديل درجة اختبار" : "إنشاء درجة اختبار"}
          </CardTitle>
          <CardDescription>إدارة درجات الاختبارات للطلاب.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.examPeriodId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  examPeriodId: event.target.value,
                  examAssessmentId: "",
                  studentEnrollmentId: "",
                }))
              }
            >
              <option value="">اختر الفترة *</option>
              {(examPeriodsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({translateAssessmentType(item.assessmentType)})
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.examAssessmentId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, examAssessmentId: event.target.value, studentEnrollmentId: "" }))
              }
            >
              <option value="">اختر التقييم *</option>
              {(assessmentsForFormQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({formatSectionWithGradeLabel(item.section)} / {formatNameCodeLabel(item.subject.name, item.subject.code)})
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.studentEnrollmentId}
              onChange={(event) => setForm((prev) => ({ ...prev, studentEnrollmentId: event.target.value }))}
            >
              <option value="">اختر القيد *</option>
              {formEnrollments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.student.fullName} ({formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatSectionWithGradeLabel(item.section)})
                </option>
              ))}
            </select>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>حاضر</span>
                <input
                  type="checkbox"
                  checked={form.isPresent}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isPresent: event.target.checked, score: event.target.checked ? prev.score : "0" }))
                  }
                />
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.score}
                onChange={(event) => setForm((prev) => ({ ...prev, score: event.target.value }))}
                placeholder="الدرجة"
                disabled={!form.isPresent}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.absenceType}
                onChange={(event) => setForm((prev) => ({ ...prev, absenceType: event.target.value as ExamAbsenceType }))}
                disabled={form.isPresent}
              >
                <option value="UNEXCUSED">{translateExamAbsenceType("UNEXCUSED")}</option>
                <option value="EXCUSED">{translateExamAbsenceType("EXCUSED")}</option>
              </select>
              <Input
                value={form.excuseDetails}
                onChange={(event) => setForm((prev) => ({ ...prev, excuseDetails: event.target.value }))}
                placeholder="تفاصيل العذر"
                disabled={form.isPresent}
              />
            </div>

            <Input
              value={form.teacherNotes}
              onChange={(event) => setForm((prev) => ({ ...prev, teacherNotes: event.target.value }))}
              placeholder="ملاحظات المعلم"
            />

            {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{formError}</div> : null}
            {mutationError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{mutationError}</div> : null}
            {actionSuccess ? <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">{actionSuccess}</div> : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
                {editingId ? "حفظ التعديلات" : "إنشاء درجة اختبار"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>درجات اختبارات الطلاب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="grid gap-2 md:grid-cols-[1fr_170px_170px_130px_110px_110px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="بحث..." className="pr-8" />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={examPeriodFilter} onChange={(event) => { setPage(1); setExamPeriodFilter(event.target.value); setAssessmentFilter("all"); }}>
              <option value="all">كل الفترات</option>
              {(examPeriodsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} ({translateAssessmentType(item.assessmentType)})</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={assessmentFilter} onChange={(event) => { setPage(1); setAssessmentFilter(event.target.value); }}>
              <option value="all">كل التقييمات</option>
              {(assessmentsForFilterQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={presenceFilter} onChange={(event) => { setPage(1); setPresenceFilter(event.target.value as "all" | "present" | "absent"); }}>
              <option value="all">حالة الحضور: الكل</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={activeFilter} onChange={(event) => { setPage(1); setActiveFilter(event.target.value as "all" | "active" | "inactive"); }}>
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          {scoresQuery.isPending ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل البيانات...</div> : null}
          {scoresQuery.error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{scoresQuery.error instanceof Error ? scoresQuery.error.message : "تعذّر تحميل البيانات."}</div> : null}
          {!scoresQuery.isPending && records.length === 0 ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد نتائج.</div> : null}

          {records.map((item) => (
            <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.studentEnrollment.student.fullName} - {item.examAssessment.title}</p>
                  <p className="text-xs text-muted-foreground">الدرجة: {item.score}/{item.examAssessment.maxScore}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.isPresent ? "default" : "secondary"}>
                    {item.isPresent ? "حاضر" : `غائب (${getAbsenceTypeLabel(item.absenceType ?? "UNEXCUSED")})`}
                  </Badge>
                  {item.examAssessment.examPeriod.isLocked ? <Badge variant="outline" className="gap-1.5"><Lock className="h-3.5 w-3.5" />مقفل</Badge> : null}
                  <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (!item.examAssessment.examPeriod.isLocked) { setEditingId(item.id); setForm(toFormState(item)); setFormError(null); setActionSuccess(null); } }} disabled={!canUpdate || item.examAssessment.examPeriod.isLocked || updateMutation.isPending}>
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ studentExamScoreId: item.id, payload: { isActive: !item.isActive } }, { onSuccess: () => setActionSuccess(item.isActive ? "تم تعطيل درجة الاختبار بنجاح." : "تم تفعيل درجة الاختبار بنجاح.") })} disabled={!canUpdate || item.examAssessment.examPeriod.isLocked || updateMutation.isPending}>
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { if (window.confirm("تأكيد الحذف؟")) deleteMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم حذف درجة الاختبار بنجاح.") }); }} disabled={!canDelete || item.examAssessment.examPeriod.isLocked || deleteMutation.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={!pagination || pagination.page <= 1 || scoresQuery.isFetching}>السابق</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))} disabled={!pagination || pagination.page >= pagination.totalPages || scoresQuery.isFetching}>التالي</Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void scoresQuery.refetch()} disabled={scoresQuery.isFetching}>
                <RefreshCw className={`h-4 w-4 ${scoresQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}









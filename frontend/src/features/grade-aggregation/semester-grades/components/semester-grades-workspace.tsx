"use client";

import * as React from "react";
import {
  Calculator,
  LoaderCircle,
  Lock,
  LockOpen,
  Medal,
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
import { useSectionOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-subject-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-student-enrollment-options-query";
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
import type { GradingWorkflowStatus, SemesterGradeListItem } from "@/lib/api/client";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { formatStudentEnrollmentOptionLabel, formatStudentEnrollmentPlacementLabel } from "@/lib/student-enrollment-display";

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

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

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
  const canFillFinalExam = hasPermission("semester-grades.fill-final-exam");
  const canLock = hasPermission("semester-grades.lock");
  const canUnlock = hasPermission("semester-grades.unlock");
  const canDelete = hasPermission("semester-grades.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [termFilter, setTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<SemesterGradeListItem | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcForm, setCalcForm] = React.useState<ActionFormState>(DEFAULT_ACTION_FORM);
  const [fillForm, setFillForm] = React.useState<ActionFormState>(DEFAULT_ACTION_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [calcInfo, setCalcInfo] = React.useState<string | null>(null);
  const [fillInfo, setFillInfo] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const termsQuery = useAcademicTermOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const selectedTermForForm = (termsQuery.data ?? []).find(
    (item) => item.id === form.academicTermId,
  );
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery({
    academicYearId: selectedTermForForm?.academicYearId,
    sectionId: form.sectionId || undefined,
  });

  const semesterGradesQuery = useSemesterGradesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateSemesterGradeMutation();
  const calculateMutation = useCalculateSemesterGradesMutation();
  const fillFinalMutation = useFillSemesterFinalExamScoresMutation();
  const updateMutation = useUpdateSemesterGradeMutation();
  const lockMutation = useLockSemesterGradeMutation();
  const unlockMutation = useUnlockSemesterGradeMutation();
  const deleteMutation = useDeleteSemesterGradeMutation();

  const records = semesterGradesQuery.data?.data ?? [];
  const pagination = semesterGradesQuery.data?.pagination;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (calculateMutation.error as Error | null)?.message ??
    (fillFinalMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (lockMutation.error as Error | null)?.message ??
    (unlockMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const resetForm = () => {
    setEditingId(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!form.academicTermId || !form.sectionId || !form.subjectId || !form.studentEnrollmentId) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }
    if (form.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }
    const semesterWorkTotal = parseOptionalNumber(form.semesterWorkTotal);
    const finalExamScore = parseOptionalNumber(form.finalExamScore);
    if (semesterWorkTotal !== undefined && semesterWorkTotal < 0) {
      setFormError("مجموع أعمال الفصل يجب أن يكون أكبر من أو يساوي 0.");
      return false;
    }
    if (finalExamScore !== undefined && finalExamScore < 0) {
      setFormError("درجة الاختبار النهائي يجب أن تكون أكبر من أو تساوي 0.");
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
      selectedEnrollment.sectionId !== form.sectionId ||
      selectedEnrollment.academicYearId !== selectedTermForForm?.academicYearId
    ) {
      setFormError("قيد الطالب لا يطابق الشعبة/السنة المختارة.");
      return false;
    }
    if (editingItem?.isLocked) {
      setFormError("لا يمكن التعديل لأن الدرجة الفصلية مقفلة.");
      return false;
    }
    setFormError(null);
    return true;
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[500px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            {editingId ? "تعديل درجة فصلية" : "إنشاء درجة فصلية"}
          </CardTitle>
          <CardDescription>حساب فصلي + سحب درجة النهائي + إدارة السجل.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">احتساب الدرجات الفصلية</p>
            <div className="grid gap-2 md:grid-cols-3">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={calcForm.academicTermId} onChange={(event) => setCalcForm((prev) => ({ ...prev, academicTermId: event.target.value }))}>
                <option value="">الفصل</option>
                {(termsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={calcForm.sectionId} onChange={(event) => setCalcForm((prev) => ({ ...prev, sectionId: event.target.value }))}>
                <option value="">الشعبة</option>
                {(sectionsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={calcForm.subjectId} onChange={(event) => setCalcForm((prev) => ({ ...prev, subjectId: event.target.value }))}>
                <option value="">المادة</option>
                {(subjectsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
              </select>
            </div>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>استبدال الدرجات اليدوية</span>
              <input type="checkbox" checked={calcForm.overwrite} onChange={(event) => setCalcForm((prev) => ({ ...prev, overwrite: event.target.checked }))} />
            </label>
            <Button type="button" variant="outline" className="w-full gap-2" disabled={!canCalculate || calculateMutation.isPending} onClick={() => {
              setCalcInfo(null);
              if (!calcForm.academicTermId || !calcForm.sectionId || !calcForm.subjectId) {
                setCalcInfo("اختر الفصل والشعبة والمادة.");
                return;
              }
              calculateMutation.mutate({ academicTermId: calcForm.academicTermId, sectionId: calcForm.sectionId, subjectId: calcForm.subjectId, overwriteManual: calcForm.overwrite }, { onSuccess: (result) => setCalcInfo(`${result.message} | الإجمالي=${result.summary.totalEnrollments}, مضاف=${result.summary.created}, محدث=${result.summary.updated}, متجاوز (مقفل)=${result.summary.skippedLocked}`) });
            }}>
              {calculateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              احتساب
            </Button>
            {calcInfo ? <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">{calcInfo}</div> : null}
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">تعبئة درجات النهائي</p>
            <div className="grid gap-2 md:grid-cols-3">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fillForm.academicTermId} onChange={(event) => setFillForm((prev) => ({ ...prev, academicTermId: event.target.value }))}>
                <option value="">الفصل</option>
                {(termsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fillForm.sectionId} onChange={(event) => setFillForm((prev) => ({ ...prev, sectionId: event.target.value }))}>
                <option value="">الشعبة</option>
                {(sectionsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={fillForm.subjectId} onChange={(event) => setFillForm((prev) => ({ ...prev, subjectId: event.target.value }))}>
                <option value="">المادة</option>
                {(subjectsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
              </select>
            </div>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>استبدال القيم الحالية</span>
              <input type="checkbox" checked={fillForm.overwrite} onChange={(event) => setFillForm((prev) => ({ ...prev, overwrite: event.target.checked }))} />
            </label>
            <Button type="button" variant="outline" className="w-full gap-2" disabled={!canFillFinalExam || fillFinalMutation.isPending} onClick={() => {
              setFillInfo(null);
              if (!fillForm.academicTermId || !fillForm.sectionId || !fillForm.subjectId) {
                setFillInfo("اختر الفصل والشعبة والمادة.");
                return;
              }
              fillFinalMutation.mutate({ academicTermId: fillForm.academicTermId, sectionId: fillForm.sectionId, subjectId: fillForm.subjectId, overwriteExisting: fillForm.overwrite }, { onSuccess: (result) => setFillInfo(`${result.message} | الإجمالي=${result.summary.totalEnrollments}, مضاف=${result.summary.created}, محدث=${result.summary.updated}, متجاوز (مقفل)=${result.summary.skippedLocked}, متجاوز (موجود)=${result.summary.skippedExisting}`) });
            }}>
              {fillFinalMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Medal className="h-4 w-4" />}
              تعبئة النهائي
            </Button>
            {fillInfo ? <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">{fillInfo}</div> : null}
          </div>

          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            setActionSuccess(null);
            if (!validateForm()) return;
            const semesterWorkTotal = parseOptionalNumber(form.semesterWorkTotal);
            const finalExamScore = parseOptionalNumber(form.finalExamScore);
            if (editingId) {
              if (!canUpdate) { setFormError("لا تملك الصلاحية المطلوبة: semester-grades.update."); return; }
              updateMutation.mutate({ semesterGradeId: editingId, payload: { semesterWorkTotal, finalExamScore, status: form.status, notes: toOptionalString(form.notes), isActive: form.isActive } }, { onSuccess: () => { resetForm(); setActionSuccess("تم تحديث الدرجة الفصلية بنجاح."); } });
              return;
            }
            if (!canCreate) { setFormError("لا تملك الصلاحية المطلوبة: semester-grades.create."); return; }
            createMutation.mutate({ academicTermId: form.academicTermId, subjectId: form.subjectId, studentEnrollmentId: form.studentEnrollmentId, semesterWorkTotal, finalExamScore, status: form.status, notes: toOptionalString(form.notes), isActive: form.isActive }, { onSuccess: () => { resetForm(); setActionSuccess("تم إنشاء الدرجة الفصلية بنجاح."); } });
          }}>
            <div className="grid gap-2 md:grid-cols-2">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.academicTermId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, academicTermId: event.target.value, studentEnrollmentId: "" }))}>
                <option value="">الفصل *</option>
                {(termsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.sectionId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, sectionId: event.target.value, studentEnrollmentId: "" }))}>
                <option value="">الشعبة *</option>
                {(sectionsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>)}
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.subjectId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}>
                <option value="">المادة *</option>
                {(subjectsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.studentEnrollmentId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, studentEnrollmentId: event.target.value }))}>
                <option value="">القيد *</option>
                {(enrollmentsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatStudentEnrollmentOptionLabel(item)}</option>)}
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Input type="number" min={0} step={0.01} value={form.semesterWorkTotal} onChange={(event) => setForm((prev) => ({ ...prev, semesterWorkTotal: event.target.value }))} placeholder="مجموع أعمال الفصل" />
              <Input type="number" min={0} step={0.01} value={form.finalExamScore} onChange={(event) => setForm((prev) => ({ ...prev, finalExamScore: event.target.value }))} placeholder="درجة الاختبار النهائي" />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as GradingWorkflowStatus }))}>
              <option value="DRAFT">مسودة</option>
              <option value="IN_REVIEW">قيد المراجعة</option>
              <option value="APPROVED">معتمد</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
            <Input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="ملاحظات" />
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            </label>
            {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{formError}</div> : null}
            {mutationError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{mutationError}</div> : null}
            {actionSuccess ? <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">{actionSuccess}</div> : null}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Medal className="h-4 w-4" />}
                {editingId ? "حفظ التعديلات" : "إنشاء درجة فصلية"}
              </Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الدرجات الفصلية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="grid gap-2 md:grid-cols-[1fr_160px_140px_140px_110px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="بحث..." className="pr-8" />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={termFilter} onChange={(event) => { setPage(1); setTermFilter(event.target.value); }}>
              <option value="all">كل الفصول</option>
              {(termsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={sectionFilter} onChange={(event) => { setPage(1); setSectionFilter(event.target.value); }}>
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={subjectFilter} onChange={(event) => { setPage(1); setSubjectFilter(event.target.value); }}>
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={activeFilter} onChange={(event) => { setPage(1); setActiveFilter(event.target.value as "all" | "active" | "inactive"); }}>
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <Button type="submit" variant="outline" className="gap-2"><Search className="h-4 w-4" />تطبيق</Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          {semesterGradesQuery.isPending ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل البيانات...</div> : null}
          {semesterGradesQuery.error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{semesterGradesQuery.error instanceof Error ? semesterGradesQuery.error.message : "تعذّر تحميل البيانات."}</div> : null}
          {!semesterGradesQuery.isPending && records.length === 0 ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد نتائج.</div> : null}

          {records.map((item) => (
            <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.studentEnrollment.student.fullName} - {formatNameCodeLabel(item.subject.name, item.subject.code)}</p>
                  <p className="text-xs text-muted-foreground">{formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code)} | {formatStudentEnrollmentPlacementLabel({ academicYear: item.academicYear, section: item.studentEnrollment.section })}</p>
                  <p className="text-xs text-muted-foreground">أعمال الفصل: {item.semesterWorkTotal} | النهائي: {item.finalExamScore ?? 0} | الإجمالي: {item.semesterTotal}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>{translateGradingWorkflowStatus(item.status)}</Badge>
                  <Badge variant={item.isLocked ? "default" : "secondary"}>{item.isLocked ? "مقفل" : "غير مقفل"}</Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (!item.isLocked && canUpdate) { setEditingId(item.id); setEditingItem(item); setForm(toFormState(item)); setFormError(null); setActionSuccess(null); } }} disabled={!canUpdate || item.isLocked || updateMutation.isPending}>
                  <PencilLine className="h-3.5 w-3.5" />تعديل
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (item.isLocked) { if (canUnlock) unlockMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم إلغاء قفل الدرجة الفصلية بنجاح.") }); } else if (canLock) { lockMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم قفل الدرجة الفصلية بنجاح.") }); } }} disabled={(item.isLocked && !canUnlock) || (!item.isLocked && !canLock) || lockMutation.isPending || unlockMutation.isPending}>
                  {item.isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {item.isLocked ? "إلغاء القفل" : "قفل"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ semesterGradeId: item.id, payload: { isActive: !item.isActive } }, { onSuccess: () => setActionSuccess(item.isActive ? "تم تعطيل الدرجة الفصلية بنجاح." : "تم تفعيل الدرجة الفصلية بنجاح.") })} disabled={!canUpdate || item.isLocked || updateMutation.isPending}>
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { if (window.confirm("تأكيد الحذف؟")) deleteMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم حذف الدرجة الفصلية بنجاح.") }); }} disabled={!canDelete || item.isLocked || deleteMutation.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />حذف
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={!pagination || pagination.page <= 1 || semesterGradesQuery.isFetching}>السابق</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))} disabled={!pagination || pagination.page >= pagination.totalPages || semesterGradesQuery.isFetching}>التالي</Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void semesterGradesQuery.refetch()} disabled={semesterGradesQuery.isFetching}>
                <RefreshCw className={`h-4 w-4 ${semesterGradesQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










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
import {
  useCalculateMonthlyGradesMutation,
  useCreateMonthlyGradeMutation,
  useDeleteMonthlyGradeMutation,
  useLockMonthlyGradeMutation,
  useUnlockMonthlyGradeMutation,
  useUpdateMonthlyGradeMutation,
} from "@/features/monthly-grades/hooks/use-monthly-grades-mutations";
import { useMonthlyGradesQuery } from "@/features/monthly-grades/hooks/use-monthly-grades-query";
import { useAcademicMonthOptionsQuery } from "@/features/monthly-grades/hooks/use-academic-month-options-query";
import { useSectionOptionsQuery } from "@/features/monthly-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/monthly-grades/hooks/use-subject-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/monthly-grades/hooks/use-student-enrollment-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type { GradingWorkflowStatus, MonthlyGradeListItem } from "@/lib/api/client";

type FormState = {
  academicMonthId: string;
  sectionId: string;
  subjectId: string;
  studentEnrollmentId: string;
  activityScore: string;
  contributionScore: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

type CalculateFormState = {
  academicMonthId: string;
  sectionId: string;
  subjectId: string;
  overwriteManual: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  academicMonthId: "",
  sectionId: "",
  subjectId: "",
  studentEnrollmentId: "",
  activityScore: "",
  contributionScore: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
};

const DEFAULT_CALC_FORM: CalculateFormState = {
  academicMonthId: "",
  sectionId: "",
  subjectId: "",
  overwriteManual: false,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toFormState(item: MonthlyGradeListItem): FormState {
  return {
    academicMonthId: item.academicMonthId,
    sectionId: item.studentEnrollment.sectionId,
    subjectId: item.subjectId,
    studentEnrollmentId: item.studentEnrollmentId,
    activityScore: String(item.activityScore ?? 0),
    contributionScore: String(item.contributionScore ?? 0),
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function getWorkflowStatusLabel(status: GradingWorkflowStatus): string {
  return translateGradingWorkflowStatus(status);
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

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<MonthlyGradeListItem | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcForm, setCalcForm] = React.useState<CalculateFormState>(DEFAULT_CALC_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [calcInfo, setCalcInfo] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const monthsQuery = useAcademicMonthOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const selectedMonthForForm = (monthsQuery.data ?? []).find(
    (item) => item.id === form.academicMonthId,
  );
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery({
    academicYearId: selectedMonthForForm?.academicYearId,
    sectionId: form.sectionId || undefined,
  });

  const monthlyGradesQuery = useMonthlyGradesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
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
  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (calculateMutation.error as Error | null)?.message ??
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
    if (!form.academicMonthId || !form.sectionId || !form.subjectId || !form.studentEnrollmentId) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }
    if (form.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }
    const activityScore = parseOptionalNumber(form.activityScore);
    const contributionScore = parseOptionalNumber(form.contributionScore);
    if (activityScore !== undefined && activityScore < 0) {
      setFormError("درجة النشاط يجب أن تكون أكبر من أو تساوي 0.");
      return false;
    }
    if (contributionScore !== undefined && contributionScore < 0) {
      setFormError("درجة المشاركة يجب أن تكون أكبر من أو تساوي 0.");
      return false;
    }
    if (editingItem) {
      if (
        activityScore !== undefined &&
        activityScore > editingItem.gradingPolicy.maxActivityScore
      ) {
        setFormError(`درجة النشاط يجب ألا تتجاوز ${editingItem.gradingPolicy.maxActivityScore}.`);
        return false;
      }
      if (
        contributionScore !== undefined &&
        contributionScore > editingItem.gradingPolicy.maxContributionScore
      ) {
        setFormError(
          `درجة المشاركة يجب ألا تتجاوز ${editingItem.gradingPolicy.maxContributionScore}.`,
        );
        return false;
      }
    }
    setFormError(null);
    return true;
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    calculateMutation.isPending ||
    lockMutation.isPending ||
    unlockMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[500px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            {editingId ? "تعديل درجة شهرية" : "إنشاء درجة شهرية"}
          </CardTitle>
          <CardDescription>إنشاء/تعديل مع إعادة الحساب الجماعي.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">الاحتساب</p>
            <div className="grid gap-2 md:grid-cols-3">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={calcForm.academicMonthId} onChange={(event) => setCalcForm((prev) => ({ ...prev, academicMonthId: event.target.value }))}>
                <option value="">الشهر</option>
                {(monthsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
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
              <span>استبدال الإدخال اليدوي</span>
              <input type="checkbox" checked={calcForm.overwriteManual} onChange={(event) => setCalcForm((prev) => ({ ...prev, overwriteManual: event.target.checked }))} />
            </label>
            <Button type="button" variant="outline" className="w-full gap-2" disabled={!canCalculate || calculateMutation.isPending} onClick={() => {
              setCalcInfo(null);
              if (!calcForm.academicMonthId || !calcForm.sectionId || !calcForm.subjectId) {
                setCalcInfo("اختر الشهر والشعبة والمادة.");
                return;
              }
              calculateMutation.mutate(calcForm, { onSuccess: (result) => setCalcInfo(`${result.message} | الإجمالي=${result.summary.totalEnrollments}, الجديد=${result.summary.created}, المحدّث=${result.summary.updated}, المتجاوز=${result.summary.skippedLocked}`) });
            }}>
              {calculateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              احتساب
            </Button>
            {calcInfo ? <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">{calcInfo}</div> : null}
          </div>

          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            setActionSuccess(null);
            if (!validateForm()) return;
            const activityScore = parseOptionalNumber(form.activityScore);
            const contributionScore = parseOptionalNumber(form.contributionScore);
            if (editingId) {
              if (!canUpdate) { setFormError("لا تملك الصلاحية المطلوبة: monthly-grades.update."); return; }
              updateMutation.mutate({ monthlyGradeId: editingId, payload: { activityScore, contributionScore, status: form.status, notes: toOptionalString(form.notes), isActive: form.isActive } }, { onSuccess: () => { resetForm(); setActionSuccess("تم تحديث الدرجة الشهرية بنجاح."); } });
              return;
            }
            if (!canCreate) { setFormError("لا تملك الصلاحية المطلوبة: monthly-grades.create."); return; }
            createMutation.mutate({ studentEnrollmentId: form.studentEnrollmentId, subjectId: form.subjectId, academicMonthId: form.academicMonthId, activityScore, contributionScore, notes: toOptionalString(form.notes), isActive: form.isActive }, { onSuccess: () => { resetForm(); setActionSuccess("تم إنشاء الدرجة الشهرية بنجاح."); } });
          }}>
            <div className="grid gap-2 md:grid-cols-2">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.academicMonthId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, academicMonthId: event.target.value, studentEnrollmentId: "" }))}>
                <option value="">الشهر *</option>
                {(monthsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
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
                {(enrollmentsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.student.fullName} ({formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatSectionWithGradeLabel(item.section)})</option>)}
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Input type="number" min={0} step={0.01} value={form.activityScore} onChange={(event) => setForm((prev) => ({ ...prev, activityScore: event.target.value }))} placeholder="النشاط" />
              <Input type="number" min={0} step={0.01} value={form.contributionScore} onChange={(event) => setForm((prev) => ({ ...prev, contributionScore: event.target.value }))} placeholder="المشاركة" />
            </div>
            {editingId ? (
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as GradingWorkflowStatus }))}>
                <option value="DRAFT">مسودة</option>
                <option value="IN_REVIEW">قيد المراجعة</option>
                <option value="APPROVED">معتمد</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            ) : null}
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
                {editingId ? "حفظ التعديلات" : "إنشاء درجة شهرية"}
              </Button>
              {editingId ? <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الدرجات الشهرية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="grid gap-2 md:grid-cols-[1fr_170px_150px_150px_110px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="بحث..." className="pr-8" />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={monthFilter} onChange={(event) => { setPage(1); setMonthFilter(event.target.value); }}>
              <option value="all">كل الأشهر</option>
              {(monthsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>)}
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
          {monthlyGradesQuery.isPending ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل البيانات...</div> : null}
          {monthlyGradesQuery.error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{monthlyGradesQuery.error instanceof Error ? monthlyGradesQuery.error.message : "تعذّر تحميل البيانات."}</div> : null}
          {!monthlyGradesQuery.isPending && records.length === 0 ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد نتائج.</div> : null}

          {records.map((item) => (
            <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.studentEnrollment.student.fullName} - {formatNameCodeLabel(item.subject.name, item.subject.code)}</p>
                  <p className="text-xs text-muted-foreground">{formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code)} | {formatSectionWithGradeLabel(item.studentEnrollment.section)}</p>
                  <p className="text-xs text-muted-foreground">الحضور {item.attendanceScore} | الواجب {item.homeworkScore} | النشاط {item.activityScore} | المشاركة {item.contributionScore} | الاختبار {item.examScore} | الإجمالي {item.monthlyTotal}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>{getWorkflowStatusLabel(item.status)}</Badge>
                  <Badge variant={item.isLocked ? "default" : "secondary"}>{item.isLocked ? "مقفل" : "غير مقفل"}</Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (!item.isLocked && canUpdate) { setEditingId(item.id); setEditingItem(item); setForm(toFormState(item)); setFormError(null); setActionSuccess(null); } }} disabled={!canUpdate || item.isLocked || updateMutation.isPending}>
                  <PencilLine className="h-3.5 w-3.5" />تعديل
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (item.isLocked) { if (canUnlock) unlockMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم إلغاء قفل الدرجة الشهرية بنجاح.") }); } else if (canLock) { lockMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم قفل الدرجة الشهرية بنجاح.") }); } }} disabled={(item.isLocked && !canUnlock) || (!item.isLocked && !canLock) || lockMutation.isPending || unlockMutation.isPending}>
                  {item.isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {item.isLocked ? "إلغاء القفل" : "قفل"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { if (!item.isLocked && canUpdate) updateMutation.mutate({ monthlyGradeId: item.id, payload: { isActive: !item.isActive } }, { onSuccess: () => setActionSuccess(item.isActive ? "تم تعطيل الدرجة الشهرية بنجاح." : "تم تفعيل الدرجة الشهرية بنجاح.") }); }} disabled={!canUpdate || item.isLocked || updateMutation.isPending}>
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { if (!item.isLocked && canDelete && window.confirm("تأكيد الحذف؟")) deleteMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم حذف الدرجة الشهرية بنجاح.") }); }} disabled={!canDelete || item.isLocked || deleteMutation.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />حذف
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={!pagination || pagination.page <= 1 || monthlyGradesQuery.isFetching}>السابق</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))} disabled={!pagination || pagination.page >= pagination.totalPages || monthlyGradesQuery.isFetching}>التالي</Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void monthlyGradesQuery.refetch()} disabled={monthlyGradesQuery.isFetching}>
                <RefreshCw className={`h-4 w-4 ${monthlyGradesQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}










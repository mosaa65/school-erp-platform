"use client";

import * as React from "react";
import {
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
import { useAnnualStatusOptionsQuery } from "@/features/annual-grades/hooks/use-annual-status-options-query";
import {
  useCreateAnnualGradeMutation,
  useDeleteAnnualGradeMutation,
  useLockAnnualGradeMutation,
  useUnlockAnnualGradeMutation,
  useUpdateAnnualGradeMutation,
} from "@/features/annual-grades/hooks/use-annual-grades-mutations";
import { useAnnualGradesQuery } from "@/features/annual-grades/hooks/use-annual-grades-query";
import { useAcademicYearOptionsQuery } from "@/features/annual-grades/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/annual-grades/hooks/use-section-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/annual-grades/hooks/use-student-enrollment-options-query";
import { useSubjectOptionsQuery } from "@/features/annual-grades/hooks/use-subject-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import type { AnnualGradeListItem, GradingWorkflowStatus } from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

type FormState = {
  academicYearId: string;
  sectionId: string;
  subjectId: string;
  studentEnrollmentId: string;
  semester1Total: string;
  semester2Total: string;
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
  annualPercentage: "",
  finalStatusId: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
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

function toFormState(item: AnnualGradeListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    sectionId: item.studentEnrollment.sectionId,
    subjectId: item.subjectId,
    studentEnrollmentId: item.studentEnrollmentId,
    semester1Total: String(item.semester1Total),
    semester2Total: String(item.semester2Total),
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
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED"
  >("all");
  const [lockFilter, setLockFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<AnnualGradeListItem | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const annualStatusesQuery = useAnnualStatusOptionsQuery();
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery({
    academicYearId: form.academicYearId || undefined,
    sectionId: form.sectionId || undefined,
  });

  const annualGradesQuery = useAnnualGradesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
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

  const records = annualGradesQuery.data?.data ?? [];
  const pagination = annualGradesQuery.data?.pagination;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
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
    if (
      !form.academicYearId ||
      !form.sectionId ||
      !form.subjectId ||
      !form.studentEnrollmentId ||
      !form.finalStatusId
    ) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }
    if (form.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    const semester1Total = parseOptionalNumber(form.semester1Total);
    const semester2Total = parseOptionalNumber(form.semester2Total);
    const annualPercentage = parseOptionalNumber(form.annualPercentage);
    if (semester1Total !== undefined && semester1Total < 0) {
      setFormError("مجموع الفصل الأول يجب أن يكون أكبر من أو يساوي 0.");
      return false;
    }
    if (semester2Total !== undefined && semester2Total < 0) {
      setFormError("مجموع الفصل الثاني يجب أن يكون أكبر من أو يساوي 0.");
      return false;
    }
    if (annualPercentage !== undefined && annualPercentage < 0) {
      setFormError("النسبة السنوية يجب أن تكون أكبر من أو تساوي 0.");
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
      selectedEnrollment.academicYearId !== form.academicYearId
    ) {
      setFormError("قيد الطالب لا يطابق السنة/الشعبة المختارة.");
      return false;
    }
    if (editingItem?.isLocked) {
      setFormError("لا يمكن التعديل لأن السجل مقفل.");
      return false;
    }

    setFormError(null);
    return true;
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[520px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            {editingId ? "تعديل درجة سنوية" : "إنشاء درجة سنوية"}
          </CardTitle>
          <CardDescription>إدارة الدرجات السنوية لكل مادة لكل طالب.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validateForm()) {
                return;
              }
              const semester1Total = parseOptionalNumber(form.semester1Total);
              const semester2Total = parseOptionalNumber(form.semester2Total);
              const annualPercentage = parseOptionalNumber(form.annualPercentage);

              if (editingId) {
                if (!canUpdate) {
                  setFormError("لا تملك صلاحية annual-grades.update.");
                  return;
                }
                updateMutation.mutate(
                  {
                    annualGradeId: editingId,
                    payload: {
                      semester1Total,
                      semester2Total,
                      annualPercentage,
                      finalStatusId: form.finalStatusId,
                      status: form.status,
                      notes: toOptionalString(form.notes),
                      isActive: form.isActive,
                    },
                  },
                  { onSuccess: () => resetForm() },
                );
                return;
              }

              if (!canCreate) {
                setFormError("لا تملك صلاحية annual-grades.create.");
                return;
              }
              createMutation.mutate(
                {
                  studentEnrollmentId: form.studentEnrollmentId,
                  subjectId: form.subjectId,
                  academicYearId: form.academicYearId,
                  semester1Total,
                  semester2Total,
                  annualPercentage,
                  finalStatusId: form.finalStatusId,
                  status: form.status,
                  notes: toOptionalString(form.notes),
                  isActive: form.isActive,
                },
                { onSuccess: () => resetForm() },
              );
            }}
          >
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.academicYearId}
                disabled={editingId !== null}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    academicYearId: event.target.value,
                    studentEnrollmentId: "",
                  }))
                }
              >
                <option value="">السنة الدراسية *</option>
                {(academicYearsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.sectionId}
                disabled={editingId !== null}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sectionId: event.target.value,
                    studentEnrollmentId: "",
                  }))
                }
              >
                <option value="">الشعبة *</option>
                {(sectionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.subjectId}
                disabled={editingId !== null}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    subjectId: event.target.value,
                  }))
                }
              >
                <option value="">المادة *</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.studentEnrollmentId}
                disabled={editingId !== null}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    studentEnrollmentId: event.target.value,
                  }))
                }
              >
                <option value="">القيد *</option>
                {(enrollmentsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.student.fullName} ({formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatNameCodeLabel(item.section.name, item.section.code)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.semester1Total}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, semester1Total: event.target.value }))
                }
                placeholder="مجموع الفصل الأول"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.semester2Total}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, semester2Total: event.target.value }))
                }
                placeholder="مجموع الفصل الثاني"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.annualPercentage}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, annualPercentage: event.target.value }))
                }
                placeholder="النسبة السنوية (اختياري)"
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.finalStatusId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    finalStatusId: event.target.value,
                  }))
                }
              >
                <option value="">الحالة النهائية *</option>
                {(annualStatusesQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as GradingWorkflowStatus,
                }))
              }
            >
              <option value="DRAFT">مسودة</option>
              <option value="IN_REVIEW">قيد المراجعة</option>
              <option value="APPROVED">معتمد</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>

            <Input
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="ملاحظات"
            />

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
            </label>

            {formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {formError}
              </div>
            ) : null}
            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {mutationError}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Medal className="h-4 w-4" />
                )}
                {editingId ? "حفظ التعديلات" : "إنشاء درجة سنوية"}
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
            <CardTitle>الدرجات السنوية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="grid gap-2 md:grid-cols-[1fr_150px_130px_130px_140px_130px_110px_110px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث..."
                className="pr-8"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={yearFilter}
              onChange={(event) => {
                setPage(1);
                setYearFilter(event.target.value);
              }}
            >
              <option value="all">كل السنوات</option>
              {(academicYearsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sectionFilter}
              onChange={(event) => {
                setPage(1);
                setSectionFilter(event.target.value);
              }}
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={finalStatusFilter}
              onChange={(event) => {
                setPage(1);
                setFinalStatusFilter(event.target.value);
              }}
            >
              <option value="all">كل حالات النتيجة</option>
              {(annualStatusesQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | "DRAFT"
                    | "IN_REVIEW"
                    | "APPROVED"
                    | "ARCHIVED",
                );
              }}
            >
              <option value="all">الحالة: الكل</option>
              <option value="DRAFT">مسودة</option>
              <option value="IN_REVIEW">قيد المراجعة</option>
              <option value="APPROVED">معتمد</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={lockFilter}
              onChange={(event) => {
                setPage(1);
                setLockFilter(event.target.value as "all" | "locked" | "unlocked");
              }}
            >
              <option value="all">القفل: الكل</option>
              <option value="locked">مقفل</option>
              <option value="unlocked">غير مقفل</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
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
          {annualGradesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}
          {annualGradesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {annualGradesQuery.error instanceof Error
                ? annualGradesQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}
          {!annualGradesQuery.isPending && records.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج.
            </div>
          ) : null}

          {records.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.studentEnrollment.student.fullName} - {formatNameCodeLabel(item.subject.name, item.subject.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} | {formatNameCodeLabel(item.studentEnrollment.section.name, item.studentEnrollment.section.code)} |{" "}
                    الحالة النهائية: {formatNameCodeLabel(item.finalStatus.name, item.finalStatus.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ف1: {item.semester1Total} | ف2: {item.semester2Total} | الإجمالي:{" "}
                    {item.annualTotal} | %: {item.annualPercentage ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>
                    {translateGradingWorkflowStatus(item.status)}
                  </Badge>
                  <Badge variant={item.isLocked ? "default" : "secondary"}>
                    {item.isLocked ? "مقفل" : "غير مقفل"}
                  </Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (item.isLocked || !canUpdate) {
                      return;
                    }
                    setEditingId(item.id);
                    setEditingItem(item);
                    setForm(toFormState(item));
                    setFormError(null);
                  }}
                  disabled={!canUpdate || item.isLocked || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (item.isLocked) {
                      if (canUnlock) {
                        unlockMutation.mutate(item.id);
                      }
                      return;
                    }
                    if (canLock) {
                      lockMutation.mutate(item.id);
                    }
                  }}
                  disabled={
                    (item.isLocked && !canUnlock) ||
                    (!item.isLocked && !canLock) ||
                    lockMutation.isPending ||
                    unlockMutation.isPending
                  }
                >
                  {item.isLocked ? (
                    <LockOpen className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {item.isLocked ? "إلغاء القفل" : "قفل"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateMutation.mutate({
                      annualGradeId: item.id,
                      payload: { isActive: !item.isActive },
                    })
                  }
                  disabled={!canUpdate || item.isLocked || updateMutation.isPending}
                >
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (!window.confirm("تأكيد الحذف؟")) {
                      return;
                    }
                    deleteMutation.mutate(item.id);
                  }}
                  disabled={!canDelete || item.isLocked || deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || annualGradesQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                  )
                }
                disabled={
                  !pagination ||
                  pagination.page >= pagination.totalPages ||
                  annualGradesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void annualGradesQuery.refetch()}
                disabled={annualGradesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${annualGradesQuery.isFetching ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}









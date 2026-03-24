"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Calculator,
  LoaderCircle,
  Lock,
  LockOpen,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
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
import { useStudentEnrollmentOptionsQuery } from "@/features/grade-aggregation/monthly-grades/hooks/use-student-enrollment-options-query";
import {
  toStudentEnrollmentPickerOption,
  type StudentEnrollmentPickerOption,
} from "@/features/students/lib/student-enrollment-picker";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { formatStudentEnrollmentPlacementLabel } from "@/lib/student-enrollment-display";
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

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

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
  const [filterDraft, setFilterDraft] = React.useState<{
    month: string;
    section: string;
    subject: string;
    active: "all" | "active" | "inactive";
  }>({
    month: "all",
    section: "all",
    subject: "all",
    active: "all",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcForm, setCalcForm] = React.useState<CalculateFormState>(DEFAULT_CALC_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [calcInfo, setCalcInfo] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [selectedFormEnrollmentOption, setSelectedFormEnrollmentOption] =
    React.useState<StudentEnrollmentPickerOption | null>(null);

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

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      month: monthFilter,
      section: sectionFilter,
      subject: subjectFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, monthFilter, sectionFilter, subjectFilter]);

  React.useEffect(() => {
    if (!editingId) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
      setSelectedFormEnrollmentOption(null);
    }
  }, [editingId, records]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setSelectedFormEnrollmentOption(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setSelectedFormEnrollmentOption(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: MonthlyGradeListItem) => {
    if (!canUpdate || item.isLocked) {
      return;
    }

    setActionSuccess(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setFormError(null);
    setSelectedFormEnrollmentOption(toStudentEnrollmentPickerOption(item.studentEnrollment));
    setIsFormOpen(true);
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
    const selectedEnrollment = (enrollmentsQuery.data ?? []).find(
      (item) => item.id === form.studentEnrollmentId,
    );
    if (!selectedEnrollment) {
      setFormError("قيد الطالب غير صالح.");
      return false;
    }
    if (
      selectedEnrollment.sectionId !== form.sectionId ||
      selectedEnrollment.academicYearId !== selectedMonthForForm?.academicYearId
    ) {
      setFormError("قيد الطالب لا يطابق الشهر/الشعبة المختارة.");
      return false;
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

  const clearFilters = () => {
    setPage(1);
    setMonthFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setActiveFilter("all");
    setFilterDraft({
      month: "all",
      section: "all",
      subject: "all",
      active: "all",
    });
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setMonthFilter(filterDraft.month);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      monthFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, monthFilter, searchInput, sectionFilter, subjectFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <SearchField
              containerClassName="min-w-0"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث باسم الطالب أو المادة..."
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="h-11 w-11 justify-center px-0 sm:w-auto sm:px-4 sm:justify-start [&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline [&>span:nth-child(3)]:hidden sm:[&>span:nth-child(3)]:inline"
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الدرجات الشهرية"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1 gap-1.5">
                <Trash2 className="h-4 w-4" />
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.month}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, month: event.target.value }))
              }
            >
              <option value="all">كل الأشهر</option>
              {(monthsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.section}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, section: event.target.value }))
              }
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatSectionWithGradeLabel(item)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.subject}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))
              }
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              احتساب الدرجات الشهرية
            </CardTitle>
            <CardDescription>
              إعادة احتساب الدرجات جماعيًا حسب الشهر والشعبة والمادة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <SelectField
                value={calcForm.academicMonthId}
                onChange={(event) =>
                  setCalcForm((prev) => ({ ...prev, academicMonthId: event.target.value }))
                }
              >
                <option value="">الشهر</option>
                {(monthsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={calcForm.sectionId}
                onChange={(event) =>
                  setCalcForm((prev) => ({ ...prev, sectionId: event.target.value }))
                }
              >
                <option value="">الشعبة</option>
                {(sectionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatSectionWithGradeLabel(item)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={calcForm.subjectId}
                onChange={(event) =>
                  setCalcForm((prev) => ({ ...prev, subjectId: event.target.value }))
                }
              >
                <option value="">المادة</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={!canCalculate || calculateMutation.isPending}
              onClick={() => {
                setCalcInfo(null);
                if (!calcForm.academicMonthId || !calcForm.sectionId || !calcForm.subjectId) {
                  setCalcInfo("اختر الشهر والشعبة والمادة.");
                  return;
                }
                calculateMutation.mutate(calcForm, {
                  onSuccess: (result) =>
                    setCalcInfo(
                      `${result.message} | الإجمالي=${result.summary.totalEnrollments}, الجديد=${result.summary.created}, المحدّث=${result.summary.updated}, المتجاوز=${result.summary.skippedLocked}`,
                    ),
                });
              }}
            >
              {calculateMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              احتساب
            </Button>
            {calcInfo ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">
                {calcInfo}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>الدرجات الشهرية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إنشاء/تعديل مع الاحتفاظ بإعادة الحساب الجماعي من نفس الشاشة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}
            {monthlyGradesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}
            {monthlyGradesQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {monthlyGradesQuery.error instanceof Error
                  ? monthlyGradesQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}
            {!monthlyGradesQuery.isPending && records.length === 0 ? (
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
                      {item.studentEnrollment.student.fullName} -{" "}
                      {formatNameCodeLabel(item.subject.name, item.subject.code)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code)} |{" "}
                      {formatStudentEnrollmentPlacementLabel({
                        academicYear: item.academicYear,
                        gradeLevel: item.studentEnrollment.gradeLevel,
                        section: item.studentEnrollment.section,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الإجمالي: {item.monthlyTotal} | تلقائي: {item.periodGradeComponents.length} | يدوي:{" "}
                      {item.customComponentScores.length}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>
                      {getWorkflowStatusLabel(item.status)}
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
                    onClick={() => handleStartEdit(item)}
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
                          unlockMutation.mutate(item.id, {
                            onSuccess: () => setActionSuccess("تم إلغاء قفل الدرجة الشهرية بنجاح."),
                          });
                        }
                      } else if (canLock) {
                        lockMutation.mutate(item.id, {
                          onSuccess: () => setActionSuccess("تم قفل الدرجة الشهرية بنجاح."),
                        });
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
                    onClick={() => {
                      if (!item.isLocked && canUpdate) {
                        updateMutation.mutate(
                          {
                            monthlyGradeId: item.id,
                            payload: { isActive: !item.isActive },
                          },
                          {
                            onSuccess: () =>
                              setActionSuccess(
                                item.isActive
                                  ? "تم تعطيل الدرجة الشهرية بنجاح."
                                  : "تم تفعيل الدرجة الشهرية بنجاح.",
                              ),
                          },
                        );
                      }
                    }}
                    disabled={!canUpdate || item.isLocked || updateMutation.isPending}
                  >
                    {item.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (!item.isLocked && canDelete && window.confirm("تأكيد الحذف؟")) {
                        deleteMutation.mutate(item.id, {
                          onSuccess: () => setActionSuccess("تم حذف الدرجة الشهرية بنجاح."),
                        });
                      }
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
                  disabled={!pagination || pagination.page <= 1 || monthlyGradesQuery.isFetching}
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
                    monthlyGradesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void monthlyGradesQuery.refetch()}
                  disabled={monthlyGradesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${monthlyGradesQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة درجة شهرية"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={editingId ? "تعديل درجة شهرية" : "إنشاء درجة شهرية"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={editingId ? "حفظ التعديلات" : "إنشاء درجة شهرية"}
        showFooter={false}
      >
        <div className="mb-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          المكوّنات اليدوية تُسجَّل من شاشة “مكوّنات شهرية إضافية”.
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setActionSuccess(null);
            if (!validateForm()) {
              return;
            }

            if (editingId) {
              if (!canUpdate) {
                setFormError("لا تملك الصلاحية المطلوبة: monthly-grades.update.");
                return;
              }
              updateMutation.mutate(
                {
                  monthlyGradeId: editingId,
                  payload: {
                    status: form.status,
                    notes: toOptionalString(form.notes),
                    isActive: form.isActive,
                  },
                },
                {
                  onSuccess: () => {
                    resetForm();
                    setActionSuccess("تم تحديث الدرجة الشهرية بنجاح.");
                  },
                },
              );
              return;
            }

            if (!canCreate) {
              setFormError("لا تملك الصلاحية المطلوبة: monthly-grades.create.");
              return;
            }
            createMutation.mutate(
              {
                studentEnrollmentId: form.studentEnrollmentId,
                subjectId: form.subjectId,
                academicMonthId: form.academicMonthId,
                notes: toOptionalString(form.notes),
                isActive: form.isActive,
              },
              {
                onSuccess: () => {
                  resetForm();
                  setActionSuccess("تم إنشاء الدرجة الشهرية بنجاح.");
                },
              },
            );
          }}
        >
          <div className="grid gap-2 md:grid-cols-2">
            <SelectField
              value={form.academicMonthId}
              disabled={editingId !== null}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  academicMonthId: event.target.value,
                  studentEnrollmentId: "",
                }));
                setSelectedFormEnrollmentOption(null);
              }}
            >
              <option value="">الشهر *</option>
              {(monthsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={form.sectionId}
              disabled={editingId !== null}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  sectionId: event.target.value,
                  studentEnrollmentId: "",
                }));
                setSelectedFormEnrollmentOption(null);
              }}
            >
              <option value="">الشعبة *</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatSectionWithGradeLabel(item)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <SelectField
              value={form.subjectId}
              disabled={editingId !== null}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, subjectId: event.target.value }))
              }
            >
              <option value="">المادة *</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <StudentEnrollmentPickerSheet
              scope="monthly-grades"
              variant="form"
              value={form.studentEnrollmentId}
              selectedOption={selectedFormEnrollmentOption}
              academicYearId={selectedMonthForForm?.academicYearId}
              sectionId={form.sectionId || undefined}
              disabled={editingId !== null}
              onSelect={(option) => {
                setSelectedFormEnrollmentOption(option);
                setForm((prev) => ({
                  ...prev,
                  studentEnrollmentId: option?.id ?? "",
                }));
              }}
            />
          </div>
          {editingId ? (
            <SelectField
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
            </SelectField>
          ) : null}
          <Input
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
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
              {editingId ? "حفظ التعديلات" : "إنشاء درجة شهرية"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              إلغاء
            </Button>
          </div>
        </form>
      </BottomSheetForm>
    </>
  );
}


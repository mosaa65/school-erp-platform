"use client";

import * as React from "react";
import {
  Calculator,
  Filter,
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
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAcademicYearOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-section-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-student-enrollment-options-query";
import { useAnnualGradesQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-annual-grades-query";
import {
  useCalculateAnnualResultsMutation,
  useCreateAnnualResultMutation,
  useDeleteAnnualResultMutation,
  useLockAnnualResultMutation,
  useUnlockAnnualResultMutation,
  useUpdateAnnualResultMutation,
} from "@/features/results-decisions/annual-results/hooks/use-annual-results-mutations";
import { useAnnualResultsQuery } from "@/features/results-decisions/annual-results/hooks/use-annual-results-query";
import { useAcademicTermOptionsQuery } from "@/features/results-decisions/annual-results/hooks/use-academic-term-options-query";
import { usePromotionDecisionOptionsQuery } from "@/features/results-decisions/annual-results/hooks/use-promotion-decision-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import type { AnnualGradeListItem, AnnualResultListItem, GradingWorkflowStatus } from "@/lib/api/client";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";

type FormState = {
  academicYearId: string;
  sectionId: string;
  studentEnrollmentId: string;
  totalAllSubjects: string;
  maxPossibleTotal: string;
  percentage: string;
  passedSubjectsCount: string;
  failedSubjectsCount: string;
  promotionDecisionId: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  academicYearId: "",
  sectionId: "",
  studentEnrollmentId: "",
  totalAllSubjects: "",
  maxPossibleTotal: "",
  percentage: "",
  passedSubjectsCount: "",
  failedSubjectsCount: "",
  promotionDecisionId: "",
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

function parseOptionalInt(value: string): number | undefined {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function formatAnnualGradeTerms(item: AnnualGradeListItem): string {
  if (item.termTotals.length > 0) {
    const sorted = [...item.termTotals].sort(
      (a, b) => a.academicTerm.sequence - b.academicTerm.sequence,
    );
    return sorted
      .map((term) => `${term.academicTerm.name} (${term.academicTerm.code}): ${term.termTotal}`)
      .join(" | ");
  }

  return `ف1: ${item.semester1Total} | ف2: ${item.semester2Total}`;
}

function toFormState(item: AnnualResultListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    sectionId: item.studentEnrollment.sectionId,
    studentEnrollmentId: item.studentEnrollmentId,
    totalAllSubjects: String(item.totalAllSubjects),
    maxPossibleTotal: String(item.maxPossibleTotal),
    percentage: String(item.percentage),
    passedSubjectsCount: String(item.passedSubjectsCount),
    failedSubjectsCount: String(item.failedSubjectsCount),
    promotionDecisionId: item.promotionDecisionId,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function AnnualResultSubjectsPanel({
  studentEnrollmentId,
  academicYearId,
}: {
  studentEnrollmentId: string;
  academicYearId: string;
}) {
  const annualGradesQuery = useAnnualGradesQuery({
    page: 1,
    limit: 200,
    academicYearId,
    studentEnrollmentId,
  });

  if (annualGradesQuery.isPending) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        جارٍ تحميل درجات المواد...
      </div>
    );
  }

  if (annualGradesQuery.error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
        {annualGradesQuery.error instanceof Error
          ? annualGradesQuery.error.message
          : "تعذر تحميل الدرجات السنوية للمواد."}
      </div>
    );
  }

  const rows = annualGradesQuery.data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        لا توجد درجات سنوية للمواد.
      </div>
    );
  }

  const passedCount = rows.filter((row) => row.finalStatus.code === "PASS").length;
  const failedCount = rows.length - passedCount;
  const totalAllSubjects = rows.reduce((sum, row) => sum + row.annualTotal, 0);

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 p-2 text-xs text-muted-foreground">
        <span>المواد: {rows.length}</span>
        <span>ناجح: {passedCount}</span>
        <span>راسب: {failedCount}</span>
        <span>إجمالي الدرجات: {totalAllSubjects}</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-border/60 p-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{formatNameCodeLabel(row.subject.name, row.subject.code)}</span>
            <span className="text-muted-foreground">
              الحالة: {formatNameCodeLabel(row.finalStatus.name, row.finalStatus.code)}
            </span>
          </div>
          <div className="mt-1 text-muted-foreground">
            {formatAnnualGradeTerms(row)} | الإجمالي: {row.annualTotal} | %: {row.annualPercentage ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnnualResultsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("annual-results.create");
  const canCalculate = hasPermission("annual-results.calculate");
  const canUpdate = hasPermission("annual-results.update");
  const canLock = hasPermission("annual-results.lock");
  const canUnlock = hasPermission("annual-results.unlock");
  const canDelete = hasPermission("annual-results.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [yearFilter, setYearFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    year: string;
    section: string;
    active: "all" | "active" | "inactive";
  }>({
    year: "all",
    section: "all",
    active: "all",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<AnnualResultListItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcYear, setCalcYear] = React.useState("");
  const [calcSection, setCalcSection] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [calcInfo, setCalcInfo] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const decisionsQuery = usePromotionDecisionOptionsQuery();
  const calcTermsQuery = useAcademicTermOptionsQuery(calcYear || undefined);
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery({
    academicYearId: form.academicYearId || undefined,
    sectionId: form.sectionId || undefined,
  });

  const annualResultsQuery = useAnnualResultsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateAnnualResultMutation();
  const calculateMutation = useCalculateAnnualResultsMutation();
  const updateMutation = useUpdateAnnualResultMutation();
  const lockMutation = useLockAnnualResultMutation();
  const unlockMutation = useUnlockAnnualResultMutation();
  const deleteMutation = useDeleteAnnualResultMutation();

  const records = annualResultsQuery.data?.data ?? [];
  const pagination = annualResultsQuery.data?.pagination;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (calculateMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (lockMutation.error as Error | null)?.message ??
    (unlockMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      year: yearFilter,
      section: sectionFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, sectionFilter, yearFilter]);

  React.useEffect(() => {
    if (!editingId) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setEditingItem(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, records]);

  const resetFormState = () => {
    setEditingId(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
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
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: AnnualResultListItem) => {
    if (!canUpdate || item.isLocked) {
      return;
    }

    setActionSuccess(null);
    setEditingId(item.id);
    setEditingItem(item);
    setForm(toFormState(item));
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!form.academicYearId || !form.sectionId || !form.studentEnrollmentId || !form.promotionDecisionId) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }
    if (form.notes.trim().length > 2000) {
      setFormError("الملاحظات يجب ألا تتجاوز 2000 حرف.");
      return false;
    }
    const totalAllSubjects = parseOptionalNumber(form.totalAllSubjects);
    const maxPossibleTotal = parseOptionalNumber(form.maxPossibleTotal);
    const percentage = parseOptionalNumber(form.percentage);
    const passedSubjectsCount = parseOptionalInt(form.passedSubjectsCount);
    const failedSubjectsCount = parseOptionalInt(form.failedSubjectsCount);

    if (totalAllSubjects !== undefined && totalAllSubjects < 0) {
      setFormError("إجمالي درجات المواد يجب أن يكون أكبر من أو يساوي 0.");
      return false;
    }
    if (maxPossibleTotal !== undefined && maxPossibleTotal < 0) {
      setFormError("المجموع الأقصى الممكن يجب أن يكون أكبر من أو يساوي 0.");
      return false;
    }
    if (percentage !== undefined && percentage < 0) {
      setFormError("النسبة يجب أن تكون أكبر من أو تساوي 0.");
      return false;
    }
    if (passedSubjectsCount === undefined && form.passedSubjectsCount.trim() !== "") {
      setFormError("عدد المواد الناجحة يجب أن يكون رقمًا صحيحًا.");
      return false;
    }
    if (failedSubjectsCount === undefined && form.failedSubjectsCount.trim() !== "") {
      setFormError("عدد المواد الراسبة يجب أن يكون رقمًا صحيحًا.");
      return false;
    }
    if (passedSubjectsCount !== undefined && passedSubjectsCount < 0) {
      setFormError("عدد المواد الناجحة يجب أن يكون أكبر من أو يساوي 0.");
      return false;
    }
    if (failedSubjectsCount !== undefined && failedSubjectsCount < 0) {
      setFormError("عدد المواد الراسبة يجب أن يكون أكبر من أو يساوي 0.");
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

  const clearFilters = () => {
    setPage(1);
    setYearFilter("all");
    setSectionFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", section: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setSectionFilter(filterDraft.section);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, searchInput, sectionFilter, yearFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchField
              containerClassName="min-w-[260px] max-w-lg flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث باسم الطالب..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة النتائج السنوية"
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
            <SelectField value={filterDraft.year} onChange={(event) => setFilterDraft((prev) => ({ ...prev, year: event.target.value }))}>
              <option value="all">كل السنوات</option>
              {(academicYearsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
              ))}
            </SelectField>
            <SelectField value={filterDraft.section} onChange={(event) => setFilterDraft((prev) => ({ ...prev, section: event.target.value }))}>
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>
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
              احتساب النتائج السنوية
            </CardTitle>
            <CardDescription>إنشاء النتائج السنوية آليًا من الدرجات السنوية وقرارات الترفيع.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <SelectField value={calcYear} onChange={(event) => setCalcYear(event.target.value)}>
                <option value="">السنة الدراسية</option>
                {(academicYearsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
              <SelectField value={calcSection} onChange={(event) => setCalcSection(event.target.value)}>
                <option value="">الشعبة</option>
                {(sectionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>
                ))}
              </SelectField>
            </div>
            {calcYear ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                {calcTermsQuery.isPending
                  ? "جارٍ تحميل الفصول الدراسية..."
                  : calcTermsQuery.data && calcTermsQuery.data.length > 0
                    ? `الفصول المعتمدة: ${calcTermsQuery.data.map((term) => `${term.name} (${term.code})`).join(" | ")}`
                    : "لا توجد فصول دراسية مفعلة لهذه السنة."}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={!canCalculate || calculateMutation.isPending}
              onClick={() => {
                setCalcInfo(null);
                if (!calcYear || !calcSection) {
                  setCalcInfo("اختر السنة والشعبة.");
                  return;
                }
                calculateMutation.mutate(
                  { academicYearId: calcYear, sectionId: calcSection },
                  {
                    onSuccess: (result) =>
                      setCalcInfo(
                        `${result.message} | الدرجات السنوية: جديد ${result.summary.annualGrades.created}، تحديث ${result.summary.annualGrades.updated}، متجاوز (مقفل) ${result.summary.annualGrades.skippedLocked} | النتائج السنوية: جديد ${result.summary.annualResults.created}، تحديث ${result.summary.annualResults.updated}، متجاوز (مقفل) ${result.summary.annualResults.skippedLocked}`,
                      ),
                  },
                );
              }}
            >
              {calculateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              تنفيذ الاحتساب
            </Button>
            {calcInfo ? <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">{calcInfo}</div> : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>النتائج السنوية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة النتائج السنوية مع تفاصيل المواد وقرار الترفيع.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionSuccess ? <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">{actionSuccess}</div> : null}
            {annualResultsQuery.isPending ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل البيانات...</div> : null}
            {annualResultsQuery.error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{annualResultsQuery.error instanceof Error ? annualResultsQuery.error.message : "تعذّر تحميل البيانات."}</div> : null}
            {!annualResultsQuery.isPending && records.length === 0 ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد نتائج.</div> : null}

            {records.map((item) => (
              <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.studentEnrollment.student.fullName}</p>
                    <p className="text-xs text-muted-foreground">{formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} | {formatSectionWithGradeLabel(item.studentEnrollment.section)} | {formatNameCodeLabel(item.promotionDecision.name, item.promotionDecision.code)}</p>
                    <p className="text-xs text-muted-foreground">الإجمالي: {item.totalAllSubjects}/{item.maxPossibleTotal} | النسبة: {item.percentage}% | ترتيب الشعبة: {item.rankInClass ?? "-"} | ترتيب الصف: {item.rankInGrade ?? "-"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>{translateGradingWorkflowStatus(item.status)}</Badge>
                    <Badge variant={item.isLocked ? "default" : "secondary"}>{item.isLocked ? "مقفل" : "غير مقفل"}</Badge>
                    <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate || item.isLocked || updateMutation.isPending}>
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}>
                    {expandedId === item.id ? "إخفاء المواد" : "تفاصيل المواد"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (item.isLocked) {
                        if (canUnlock) {
                          unlockMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم إلغاء قفل النتيجة السنوية بنجاح.") });
                        }
                      } else if (canLock) {
                        lockMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم قفل النتيجة السنوية بنجاح.") });
                      }
                    }}
                    disabled={(item.isLocked && !canUnlock) || (!item.isLocked && !canLock) || lockMutation.isPending || unlockMutation.isPending}
                  >
                    {item.isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {item.isLocked ? "إلغاء القفل" : "قفل"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ annualResultId: item.id, payload: { isActive: !item.isActive } }, { onSuccess: () => setActionSuccess(item.isActive ? "تم تعطيل النتيجة السنوية بنجاح." : "تم تفعيل النتيجة السنوية بنجاح.") })} disabled={!canUpdate || item.isLocked || updateMutation.isPending}>
                    {item.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { if (window.confirm("تأكيد الحذف؟")) { deleteMutation.mutate(item.id, { onSuccess: () => setActionSuccess("تم حذف النتيجة السنوية بنجاح.") }); } }} disabled={!canDelete || item.isLocked || deleteMutation.isPending}>
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
                {expandedId === item.id ? <AnnualResultSubjectsPanel studentEnrollmentId={item.studentEnrollmentId} academicYearId={item.academicYearId} /> : null}
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={!pagination || pagination.page <= 1 || annualResultsQuery.isFetching}>السابق</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))} disabled={!pagination || pagination.page >= pagination.totalPages || annualResultsQuery.isFetching}>التالي</Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void annualResultsQuery.refetch()} disabled={annualResultsQuery.isFetching}>
                  <RefreshCw className={`h-4 w-4 ${annualResultsQuery.isFetching ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-4 w-4" />} label="إضافة" ariaLabel="إضافة نتيجة سنوية" onClick={handleStartCreate} disabled={!canCreate} />

      <BottomSheetForm
        open={isFormOpen}
        title={editingId ? "تعديل نتيجة سنوية" : "إنشاء نتيجة سنوية"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={editingId ? "حفظ التعديلات" : "إنشاء نتيجة سنوية"}
        showFooter={false}
      >
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          setActionSuccess(null);
          if (!validateForm()) return;
          const totalAllSubjects = parseOptionalNumber(form.totalAllSubjects);
          const maxPossibleTotal = parseOptionalNumber(form.maxPossibleTotal);
          const percentage = parseOptionalNumber(form.percentage);
          const passedSubjectsCount = parseOptionalInt(form.passedSubjectsCount);
          const failedSubjectsCount = parseOptionalInt(form.failedSubjectsCount);
          if (editingId) {
            if (!canUpdate) { setFormError("لا تملك الصلاحية المطلوبة: annual-results.update."); return; }
            updateMutation.mutate({ annualResultId: editingId, payload: { totalAllSubjects, maxPossibleTotal, percentage, passedSubjectsCount, failedSubjectsCount, promotionDecisionId: form.promotionDecisionId, status: form.status, notes: toOptionalString(form.notes), isActive: form.isActive } }, { onSuccess: () => { resetForm(); setActionSuccess("تم تحديث النتيجة السنوية بنجاح."); } });
            return;
          }
          if (!canCreate) { setFormError("لا تملك الصلاحية المطلوبة: annual-results.create."); return; }
          createMutation.mutate({ studentEnrollmentId: form.studentEnrollmentId, academicYearId: form.academicYearId, totalAllSubjects, maxPossibleTotal, percentage, passedSubjectsCount, failedSubjectsCount, promotionDecisionId: form.promotionDecisionId, status: form.status, notes: toOptionalString(form.notes), isActive: form.isActive }, { onSuccess: () => { resetForm(); setActionSuccess("تم إنشاء النتيجة السنوية بنجاح."); } });
        }}>
          <div className="grid gap-2 md:grid-cols-2">
            <SelectField value={form.academicYearId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, academicYearId: event.target.value, studentEnrollmentId: "" }))}>
              <option value="">السنة الدراسية *</option>
              {(academicYearsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
              ))}
            </SelectField>
            <SelectField value={form.sectionId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, sectionId: event.target.value, studentEnrollmentId: "" }))}>
              <option value="">الشعبة *</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <SelectField value={form.studentEnrollmentId} disabled={editingId !== null} onChange={(event) => setForm((prev) => ({ ...prev, studentEnrollmentId: event.target.value }))}>
              <option value="">القيد *</option>
              {(enrollmentsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.student.fullName} ({formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatSectionWithGradeLabel(item.section)})</option>
              ))}
            </SelectField>
            <SelectField value={form.promotionDecisionId} onChange={(event) => setForm((prev) => ({ ...prev, promotionDecisionId: event.target.value }))}>
              <option value="">قرار الترفيع *</option>
              {(decisionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input type="number" min={0} step={0.01} value={form.totalAllSubjects} onChange={(event) => setForm((prev) => ({ ...prev, totalAllSubjects: event.target.value }))} placeholder="إجمالي درجات المواد" />
            <Input type="number" min={0} step={0.01} value={form.maxPossibleTotal} onChange={(event) => setForm((prev) => ({ ...prev, maxPossibleTotal: event.target.value }))} placeholder="الدرجة العظمى الممكنة" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input type="number" min={0} step={0.01} value={form.percentage} onChange={(event) => setForm((prev) => ({ ...prev, percentage: event.target.value }))} placeholder="النسبة المئوية" />
            <Input type="number" min={0} step={1} value={form.passedSubjectsCount} onChange={(event) => setForm((prev) => ({ ...prev, passedSubjectsCount: event.target.value }))} placeholder="المواد الناجحة" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input type="number" min={0} step={1} value={form.failedSubjectsCount} onChange={(event) => setForm((prev) => ({ ...prev, failedSubjectsCount: event.target.value }))} placeholder="المواد الراسبة" />
            <SelectField value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as GradingWorkflowStatus }))}>
              <option value="DRAFT">مسودة</option>
              <option value="IN_REVIEW">قيد المراجعة</option>
              <option value="APPROVED">معتمد</option>
              <option value="ARCHIVED">مؤرشف</option>
            </SelectField>
          </div>
          <Input value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="ملاحظات" />
          <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>نشط</span>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
          </label>
          {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{formError}</div> : null}
          {mutationError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{mutationError}</div> : null}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Medal className="h-4 w-4" />}
              {editingId ? "حفظ التعديلات" : "إنشاء نتيجة سنوية"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </form>
      </BottomSheetForm>
    </>
  );
}

"use client";

import * as React from "react";
import {
  ArrowRightLeft,
  GraduationCap,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useLookupEnrollmentStatusesQuery } from "@/features/lookup-enrollment-statuses/hooks/use-lookup-enrollment-statuses-query";
import { useGradeLevelOptionsQuery } from "@/features/student-enrollments/hooks/use-grade-level-options-query";
import {
  useCreateStudentEnrollmentMutation,
  useDeleteStudentEnrollmentMutation,
  useUpdateStudentEnrollmentMutation,
} from "@/features/student-enrollments/hooks/use-student-enrollments-mutations";
import { useStudentEnrollmentsQuery } from "@/features/student-enrollments/hooks/use-student-enrollments-query";
import { useStudentOptionsQuery } from "@/features/student-enrollments/hooks/use-student-options-query";
import { useAcademicYearOptionsQuery } from "@/features/student-enrollments/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/student-enrollments/hooks/use-section-options-query";
import type {
  StudentEnrollmentDistributionStatus,
  StudentEnrollmentListItem,
  StudentEnrollmentStatus,
} from "@/lib/api/client";

type EnrollmentFormState = {
  studentId: string;
  academicYearId: string;
  gradeLevelId: string;
  sectionId: string;
  yearlyEnrollmentNo: string;
  distributionStatus: StudentEnrollmentDistributionStatus;
  enrollmentDate: string;
  status: StudentEnrollmentStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const STATUS_OPTIONS: StudentEnrollmentStatus[] = [
  "NEW",
  "TRANSFERRED",
  "ACTIVE",
  "PROMOTED",
  "REPEATED",
  "WITHDRAWN",
  "GRADUATED",
  "SUSPENDED",
];

const ENROLLMENT_STATUS_FALLBACK_OPTIONS: Array<{
  code: StudentEnrollmentStatus;
  nameAr: string;
}> = [
  { code: "NEW", nameAr: "مستجد" },
  { code: "TRANSFERRED", nameAr: "منقول" },
  { code: "ACTIVE", nameAr: "منتظم" },
  { code: "PROMOTED", nameAr: "مُرَقّى" },
  { code: "REPEATED", nameAr: "إعادة" },
  { code: "WITHDRAWN", nameAr: "منسحب" },
  { code: "GRADUATED", nameAr: "متخرج" },
  { code: "SUSPENDED", nameAr: "موقوف" },
];

const DISTRIBUTION_STATUS_OPTIONS: Array<{
  code: StudentEnrollmentDistributionStatus;
  nameAr: string;
}> = [
  { code: "PENDING_DISTRIBUTION", nameAr: "بانتظار التوزيع" },
  { code: "ASSIGNED", nameAr: "موزع" },
  { code: "TRANSFERRED", nameAr: "منقول" },
];

function isStudentEnrollmentStatus(value: string): value is StudentEnrollmentStatus {
  return STATUS_OPTIONS.includes(value as StudentEnrollmentStatus);
}

const DEFAULT_FORM_STATE: EnrollmentFormState = {
  studentId: "",
  academicYearId: "",
  gradeLevelId: "",
  sectionId: "",
  yearlyEnrollmentNo: "",
  distributionStatus: "ASSIGNED",
  enrollmentDate: "",
  status: "ACTIVE",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateInput(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-SA");
}

function toFormState(enrollment: StudentEnrollmentListItem): EnrollmentFormState {
  return {
    studentId: enrollment.studentId,
    academicYearId: enrollment.academicYearId,
    gradeLevelId:
      enrollment.gradeLevelId ?? enrollment.gradeLevel?.id ?? enrollment.section?.gradeLevel.id ?? "",
    sectionId: enrollment.sectionId ?? "",
    yearlyEnrollmentNo: enrollment.yearlyEnrollmentNo ?? "",
    distributionStatus:
      enrollment.distributionStatus ??
      (enrollment.sectionId ? "ASSIGNED" : "PENDING_DISTRIBUTION"),
    enrollmentDate: toDateInput(enrollment.enrollmentDate),
    status: enrollment.status,
    notes: enrollment.notes ?? "",
    isActive: enrollment.isActive,
  };
}

export function StudentEnrollmentsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-enrollments.create");
  const canUpdate = hasPermission("student-enrollments.update");
  const canDelete = hasPermission("student-enrollments.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadAcademicYears = hasPermission("academic-years.read");
  const canReadGradeLevels = hasPermission("grade-levels.read");
  const canReadSections = hasPermission("sections.read");
  const canReadEnrollmentStatuses = hasPermission("lookup-enrollment-statuses.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StudentEnrollmentStatus | "all">(
    "all",
  );
  const [distributionStatusFilter, setDistributionStatusFilter] =
    React.useState<StudentEnrollmentDistributionStatus | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    student: string;
    academicYear: string;
    gradeLevel: string;
    section: string;
    status: StudentEnrollmentStatus | "all";
    distributionStatus: StudentEnrollmentDistributionStatus | "all";
    active: "all" | "active" | "inactive";
  }>({
    student: "all",
    academicYear: "all",
    gradeLevel: "all",
    section: "all",
    status: "all",
    distributionStatus: "all",
    active: "all",
  });

  const [editingEnrollmentId, setEditingEnrollmentId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<EnrollmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const enrollmentsQuery = useStudentEnrollmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    distributionStatus:
      distributionStatusFilter === "all" ? undefined : distributionStatusFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const studentsQuery = useStudentOptionsQuery();
  const academicYearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery({
    gradeLevelId: filterDraft.gradeLevel === "all" ? undefined : filterDraft.gradeLevel,
  });
  const formSectionsQuery = useSectionOptionsQuery({
    gradeLevelId: formState.gradeLevelId || undefined,
  });
  const gradeLevelOptions = React.useMemo(
    () => gradeLevelsQuery.data ?? [],
    [gradeLevelsQuery.data],
  );
  const formSectionOptions = React.useMemo(
    () => formSectionsQuery.data ?? [],
    [formSectionsQuery.data],
  );
  const enrollmentStatusesQuery = useLookupEnrollmentStatusesQuery({
    page: 1,
    limit: 100,
    isActive: true,
    enabled: canReadEnrollmentStatuses,
  });

  const createMutation = useCreateStudentEnrollmentMutation();
  const updateMutation = useUpdateStudentEnrollmentMutation();
  const deleteMutation = useDeleteStudentEnrollmentMutation();

  const enrollments = React.useMemo(
    () => enrollmentsQuery.data?.data ?? [],
    [enrollmentsQuery.data?.data],
  );
  const enrollmentStatusOptions = React.useMemo(() => {
    const items = enrollmentStatusesQuery.data?.data ?? [];
    const normalized = items
      .filter((item) => isStudentEnrollmentStatus(item.code))
      .map((item) => ({ code: item.code, nameAr: item.nameAr }));

    return normalized.length > 0 ? normalized : ENROLLMENT_STATUS_FALLBACK_OPTIONS;
  }, [enrollmentStatusesQuery.data?.data]);
  const enrollmentStatusLabels = React.useMemo(
    () => new Map(enrollmentStatusOptions.map((item) => [item.code, item.nameAr])),
    [enrollmentStatusOptions],
  );
  const pagination = enrollmentsQuery.data?.pagination;
  const isEditing = editingEnrollmentId !== null;
  const hasDependenciesReadPermissions =
    canReadStudents && canReadAcademicYears && canReadSections && canReadGradeLevels;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = enrollments.some((item) => item.id === editingEnrollmentId);
    if (!stillExists) {
      setEditingEnrollmentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingEnrollmentId, enrollments, isEditing]);

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
      student: studentFilter,
      academicYear: academicYearFilter,
      gradeLevel: gradeLevelFilter,
      section: sectionFilter,
      status: statusFilter,
      distributionStatus: distributionStatusFilter,
      active: activeFilter,
    });
  }, [
    academicYearFilter,
    activeFilter,
    distributionStatusFilter,
    gradeLevelFilter,
    isFilterOpen,
    sectionFilter,
    statusFilter,
    studentFilter,
  ]);

  const resetForm = () => {
    setEditingEnrollmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingEnrollmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const requiresSection = formState.distributionStatus !== "PENDING_DISTRIBUTION";

    if (!formState.studentId || !formState.academicYearId || !formState.gradeLevelId) {
      setFormError("الطالب والسنة الأكاديمية والصف حقول مطلوبة.");
      return false;
    }

    if (requiresSection && !formState.sectionId) {
      setFormError("الشعبة مطلوبة عندما لا تكون حالة التوزيع بانتظار التوزيع.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const normalizedSectionId = toOptionalString(formState.sectionId);
    const payload = {
      studentId: formState.studentId,
      academicYearId: formState.academicYearId,
      gradeLevelId: formState.gradeLevelId,
      distributionStatus: formState.distributionStatus,
      enrollmentDate: formState.enrollmentDate ? toDateIso(formState.enrollmentDate) : undefined,
      status: formState.status,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
      ...(isEditing
        ? { sectionId: normalizedSectionId ?? "" }
        : normalizedSectionId
          ? { sectionId: normalizedSectionId }
          : {}),
    };

    if (isEditing && editingEnrollmentId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-enrollments.update.");
        return;
      }

      updateMutation.mutate(
        {
          enrollmentId: editingEnrollmentId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث قيد الطالب بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: student-enrollments.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء قيد الطالب بنجاح.");
      },
    });
  };

  const handleStartEdit = (enrollment: StudentEnrollmentListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingEnrollmentId(enrollment.id);
    setFormState(toFormState(enrollment));
    setIsFormOpen(true);
  };

  const handleToggleActive = (enrollment: StudentEnrollmentListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        enrollmentId: enrollment.id,
        payload: {
          isActive: !enrollment.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            enrollment.isActive ? "تم تعطيل القيد بنجاح." : "تم تفعيل القيد بنجاح.",
          );
        },
      },
    );
  };

  const handleDelete = (enrollment: StudentEnrollmentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف قيد الطالب ${enrollment.student.fullName} للسنة ${enrollment.academicYear.code}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(enrollment.id, {
      onSuccess: () => {
        if (editingEnrollmentId === enrollment.id) {
          resetForm();
        }
        setActionSuccess("تم حذف قيد الطالب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const requiresSection = formState.distributionStatus !== "PENDING_DISTRIBUTION";
  const getStatusLabel = (value: StudentEnrollmentStatus) =>
    enrollmentStatusLabels.get(value) ?? value;
  const getDistributionStatusLabel = (
    value: StudentEnrollmentDistributionStatus,
  ) =>
    DISTRIBUTION_STATUS_OPTIONS.find((option) => option.code === value)?.nameAr ??
    value;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStudentFilter("all");
    setAcademicYearFilter("all");
    setGradeLevelFilter("all");
    setSectionFilter("all");
    setStatusFilter("all");
    setDistributionStatusFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const handleOpenDistributionBoard = (enrollment: StudentEnrollmentListItem) => {
    const gradeLevelId =
      enrollment.gradeLevelId ?? enrollment.gradeLevel?.id ?? enrollment.section?.gradeLevel.id;

    if (!gradeLevelId) {
      setActionSuccess(null);
      setFormError("لا يمكن فتح شاشة التوزيع قبل توفر الصف على هذا القيد.");
      return;
    }

    const query = new URLSearchParams({
      academicYearId: enrollment.academicYearId,
      gradeLevelId,
    });
    router.push(`/app/student-distributions?${query.toString()}`);
  };

  const handleReturnToPendingDistribution = (enrollment: StudentEnrollmentListItem) => {
    if (!canUpdate) {
      return;
    }

    const gradeLevelId =
      enrollment.gradeLevelId ?? enrollment.gradeLevel?.id ?? enrollment.section?.gradeLevel.id;

    if (!gradeLevelId) {
      setActionSuccess(null);
      setFormError("لا يمكن إعادة القيد إلى الانتظار قبل معرفة الصف المرتبط به.");
      return;
    }

    updateMutation.mutate(
      {
        enrollmentId: enrollment.id,
        payload: {
          gradeLevelId,
          sectionId: "",
          distributionStatus: "PENDING_DISTRIBUTION",
        },
      },
      {
        onSuccess: () => {
          setActionSuccess("تمت إعادة القيد إلى انتظار التوزيع بنجاح.");
        },
      },
    );
  };

  const applyFilters = () => {
    setPage(1);
    setStudentFilter(filterDraft.student);
    setAcademicYearFilter(filterDraft.academicYear);
    setGradeLevelFilter(filterDraft.gradeLevel);
    setSectionFilter(filterDraft.section);
    setStatusFilter(filterDraft.status);
    setDistributionStatusFilter(filterDraft.distributionStatus);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      studentFilter !== "all" ? 1 : 0,
      academicYearFilter !== "all" ? 1 : 0,
      gradeLevelFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      distributionStatusFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [
    academicYearFilter,
    activeFilter,
    distributionStatusFilter,
    gradeLevelFilter,
    searchInput,
    sectionFilter,
    statusFilter,
    studentFilter,
  ]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالطالب/رقم الطالب/رقم القيد السنوي/الصف/الشعبة/السنة..."
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
          title="فلاتر القيود"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex-1 gap-1.5"
              >
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
              value={filterDraft.student}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, student: event.target.value }))
              }
            >
              <option value="all">كل الطلاب</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admissionNo
                    ? `رقم الطالب ${student.admissionNo} - ${student.fullName}`
                    : student.fullName}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.academicYear}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, academicYear: event.target.value }))
              }
            >
              <option value="all">كل السنوات</option>
              {(academicYearsQuery.data ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.gradeLevel}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  gradeLevel: event.target.value,
                  section: "all",
                }))
              }
            >
              <option value="all">كل الصفوف</option>
              {gradeLevelOptions.map((gradeLevel) => (
                <option key={gradeLevel.id} value={gradeLevel.id}>
                  {gradeLevel.name} ({gradeLevel.code})
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
              {(sectionsQuery.data ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code} - {section.gradeLevel.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.status}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  status: event.target.value as StudentEnrollmentStatus | "all",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              {enrollmentStatusOptions.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.nameAr}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.distributionStatus}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  distributionStatus: event.target.value as
                    | StudentEnrollmentDistributionStatus
                    | "all",
                }))
              }
            >
              <option value="all">كل حالات التوزيع</option>
              {DISTRIBUTION_STATUS_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.nameAr}
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
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قيود الطلاب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة القيود الدراسية للطلاب حسب السنة والصف والشعبة والحالة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {actionSuccess ? (
            <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              {actionSuccess}
            </div>
          ) : null}

          {mutationError && !isFormOpen ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {mutationError}
            </div>
          ) : null}

          {formError && !isFormOpen ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          {enrollmentsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {enrollmentsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {enrollmentsQuery.error instanceof Error
                ? enrollmentsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!enrollmentsQuery.isPending && enrollments.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {enrollment.student.fullName} (
                    {enrollment.student.admissionNo ?? "بدون رقم طالب"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    السنة: {enrollment.academicYear.name} ({enrollment.academicYear.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الصف:{" "}
                    {enrollment.gradeLevel?.name ??
                      enrollment.section?.gradeLevel.name ??
                      "غير محدد"}
                    {enrollment.section
                      ? ` | الشعبة: ${enrollment.section.name} (${enrollment.section.code})`
                      : " | الشعبة: غير موزع"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    رقم القيد السنوي: {enrollment.yearlyEnrollmentNo ?? "سيولد تلقائيًا"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    حالة التوزيع:{" "}
                    {enrollment.distributionStatus
                      ? getDistributionStatusLabel(enrollment.distributionStatus)
                      : "غير محددة"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    تاريخ القيد: {formatDate(enrollment.enrollmentDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">ملاحظات: {enrollment.notes ?? "-"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{getStatusLabel(enrollment.status)}</Badge>
                  <Badge variant={enrollment.isActive ? "default" : "outline"}>
                    {enrollment.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleOpenDistributionBoard(enrollment)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  شاشة التوزيع
                </Button>
                {enrollment.sectionId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleReturnToPendingDistribution(enrollment)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    إرجاع للانتظار
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(enrollment)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(enrollment)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {enrollment.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(enrollment)}
                  disabled={!canDelete || deleteMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || enrollmentsQuery.isFetching}
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
                  enrollmentsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void enrollmentsQuery.refetch()}
                disabled={enrollmentsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${enrollmentsQuery.isFetching ? "animate-spin" : ""}`}
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
        label="إنشاء"
        ariaLabel="إنشاء قيد طالب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل قيد طالب" : "إنشاء قيد طالب"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء قيد"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>student-enrollments.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.studentId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, studentId: event.target.value }))
                }
                disabled={!canReadStudents}
              >
                <option value="">اختر الطالب</option>
                {(studentsQuery.data ?? []).map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} ({student.admissionNo ?? "بدون رقم طالب"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                السنة الأكاديمية *
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.academicYearId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                disabled={!canReadAcademicYears}
              >
                <option value="">اختر السنة الدراسية</option>
                {(academicYearsQuery.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} ({year.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الصف *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.gradeLevelId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    gradeLevelId: event.target.value,
                    sectionId: "",
                  }))
                }
                disabled={!canReadGradeLevels || gradeLevelsQuery.isLoading}
              >
                <option value="">اختر الصف</option>
                {gradeLevelOptions.map((gradeLevel) => (
                  <option key={gradeLevel.id} value={gradeLevel.id}>
                    {gradeLevel.name} ({gradeLevel.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                الشعبة {requiresSection ? "*" : "(اختيارية مع بانتظار التوزيع)"}
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.sectionId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    sectionId: event.target.value,
                    distributionStatus:
                      event.target.value && prev.distributionStatus === "PENDING_DISTRIBUTION"
                        ? "ASSIGNED"
                        : prev.distributionStatus,
                  }))
                }
                disabled={
                  !canReadSections ||
                  requiresSection === false ||
                  formSectionOptions.length === 0
                }
              >
                <option value="">
                  {requiresSection ? "اختر الشعبة" : "سيتم التوزيع لاحقًا"}
                </option>
                {formSectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name} ({section.code})
                  </option>
                ))}
              </select>
              {!requiresSection ? (
                <p className="text-[11px] text-muted-foreground">
                  يمكن ترك الشعبة فارغة عندما تكون حالة التوزيع بانتظار التوزيع.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                رقم القيد السنوي
              </label>
              <Input
                value={formState.yearlyEnrollmentNo}
                readOnly
                placeholder="سيُولد تلقائيًا عند الحفظ"
                className="bg-muted/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                حالة التوزيع
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.distributionStatus}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    distributionStatus:
                      event.target.value as StudentEnrollmentDistributionStatus,
                    sectionId:
                      event.target.value === "PENDING_DISTRIBUTION" ? "" : prev.sectionId,
                  }))
                }
              >
                {DISTRIBUTION_STATUS_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.nameAr}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                رقم القيد السنوي سيُولد تلقائيًا عند الحفظ. عند اختيار
                {" "} &quot;بانتظار التوزيع&quot; {" "}سيُحفظ القيد على مستوى الصف فقط بدون شعبة، ويمكن إسناده
                لاحقًا من شاشة التوزيع.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">تاريخ القيد</label>
              <Input
                type="date"
                value={formState.enrollmentDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, enrollmentDate: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as StudentEnrollmentStatus,
                  }))
                }
              >
                {enrollmentStatusOptions.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="منقول من مدرسة أخرى"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
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
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}

            {!hasDependenciesReadPermissions ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء صلاحيات القراءة: <code>students.read</code>,{" "}
                <code>academic-years.read</code>, <code>grade-levels.read</code>,{" "}
                <code>sections.read</code>.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={
                  isFormSubmitting ||
                  (!canCreate && !isEditing) ||
                  !hasDependenciesReadPermissions
                }
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء قيد"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </BottomSheetForm>
    </>
  );
}







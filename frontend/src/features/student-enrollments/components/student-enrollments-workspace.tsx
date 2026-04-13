"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Activity,
  ArrowRightLeft,
  CalendarDays,
  GraduationCap,
  Hash,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { StudentPickerSheet } from "@/components/ui/student-picker-sheet";
import { SystemMessageInline } from "@/components/feedback/system-message-inline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Fab } from "@/components/ui/fab";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useSystemMessage } from "@/hooks/use-system-message";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useLookupEnrollmentStatusesQuery } from "@/features/lookup-enrollment-statuses/hooks/use-lookup-enrollment-statuses-query";
import { useGradeLevelOptionsQuery } from "@/features/student-enrollments/hooks/use-grade-level-options-query";
import {
  useCreateStudentEnrollmentMutation,
  useDeleteStudentEnrollmentMutation,
  useUpdateStudentEnrollmentMutation,
} from "@/features/student-enrollments/hooks/use-student-enrollments-mutations";
import { useStudentEnrollmentsQuery } from "@/features/student-enrollments/hooks/use-student-enrollments-query";
import { useAcademicYearOptionsQuery } from "@/features/student-enrollments/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/student-enrollments/hooks/use-section-options-query";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
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

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    if (error.message.trim().toLowerCase() === "internal server error") {
      return fallbackMessage;
    }

    return error.message;
  }

  return fallbackMessage;
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

function buildStudentPickerOptionFromEnrollment(
  enrollment: StudentEnrollmentListItem,
): StudentPickerOption {
  const gradeLevelName =
    enrollment.gradeLevel?.name ?? enrollment.section?.gradeLevel.name ?? null;
  const sectionLabel = enrollment.section?.name ? `شعبة ${enrollment.section.name}` : null;
  const metaParts = [gradeLevelName, sectionLabel, enrollment.academicYear.name].filter(
    (part): part is string => Boolean(part),
  );

  return {
    id: enrollment.studentId,
    title: enrollment.student.fullName,
    subtitle: enrollment.student.admissionNo
      ? `رقم الطالب ${enrollment.student.admissionNo}`
      : "بدون رقم طالب",
    meta: metaParts.length > 0 ? metaParts.join(" | ") : null,
    groupLabel: gradeLevelName ? `الصف: ${gradeLevelName}` : "بدون شعبة حالية",
  };
}

export function StudentEnrollmentsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const { notify, preferences } = useSystemMessage();
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
  const [selectedFormStudent, setSelectedFormStudent] = React.useState<StudentPickerOption | null>(
    null,
  );
  const [selectedStudentFilterOption, setSelectedStudentFilterOption] =
    React.useState<StudentPickerOption | null>(null);
  const [filterDraftStudentOption, setFilterDraftStudentOption] =
    React.useState<StudentPickerOption | null>(null);

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

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = enrollments.some((item) => item.id === editingEnrollmentId);
    if (!stillExists) {
      setEditingEnrollmentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setSelectedFormStudent(null);
      setIsFormOpen(false);
    }
  }, [editingEnrollmentId, enrollments, isEditing]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

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
    setFilterDraftStudentOption(selectedStudentFilterOption);
  }, [
    academicYearFilter,
    activeFilter,
    distributionStatusFilter,
    gradeLevelFilter,
    isFilterOpen,
    sectionFilter,
    selectedStudentFilterOption,
    statusFilter,
    studentFilter,
  ]);

  const resetForm = () => {
    setEditingEnrollmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setSelectedFormStudent(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      notify.warning("لا تملك الصلاحية المطلوبة: student-enrollments.create.");
      return;
    }

    setFormError(null);
    setEditingEnrollmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setSelectedFormStudent(null);
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

  const handleSubmitForm = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

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
        const message = "لا تملك الصلاحية المطلوبة: student-enrollments.update.";
        setFormError(message);
        notify.error(message);
        return;
      }

      try {
        await notify.promise(
          () =>
            updateMutation.mutateAsync({
              enrollmentId: editingEnrollmentId,
              payload,
            }),
          {
            loading: "جارٍ تحديث قيد الطالب...",
            success: "تم تحديث قيد الطالب بنجاح.",
            error: (error) => ({
              message: getErrorMessage(error, "تعذر تحديث قيد الطالب."),
              persistent: true,
            }),
          },
        );
        resetForm();
      } catch (error) {
        setFormError(getErrorMessage(error, "تعذر تحديث قيد الطالب."));
      }
      return;
    }

    if (!canCreate) {
      const message = "لا تملك الصلاحية المطلوبة: student-enrollments.create.";
      setFormError(message);
      notify.error(message);
      return;
    }

    try {
      await notify.promise(() => createMutation.mutateAsync(payload), {
        loading: "جارٍ إنشاء قيد الطالب...",
        success: "تم إنشاء قيد الطالب بنجاح.",
        error: (error) => ({
          message: getErrorMessage(error, "تعذر إنشاء قيد الطالب."),
          persistent: true,
        }),
      });
      resetForm();
      setPage(1);
    } catch (error) {
      setFormError(getErrorMessage(error, "تعذر إنشاء قيد الطالب."));
    }
  };

  const handleStartEdit = (enrollment: StudentEnrollmentListItem) => {
    if (!canUpdate) {
      notify.warning("لا تملك الصلاحية المطلوبة: student-enrollments.update.");
      return;
    }

    setFormError(null);
    setEditingEnrollmentId(enrollment.id);
    setFormState(toFormState(enrollment));
    setSelectedFormStudent(buildStudentPickerOptionFromEnrollment(enrollment));
    setIsFormOpen(true);
  };

  const handleToggleActive = async (enrollment: StudentEnrollmentListItem) => {
    if (!canUpdate) {
      notify.warning("لا تملك الصلاحية المطلوبة: student-enrollments.update.");
      return;
    }

    try {
      await notify.promise(
        () =>
          updateMutation.mutateAsync({
            enrollmentId: enrollment.id,
            payload: {
              isActive: !enrollment.isActive,
            },
          }),
        {
          loading: enrollment.isActive
            ? "جارٍ تعطيل قيد الطالب..."
            : "جارٍ تفعيل قيد الطالب...",
          success: enrollment.isActive
            ? "تم تعطيل القيد بنجاح."
            : "تم تفعيل القيد بنجاح.",
          error: (error) => ({
            message: getErrorMessage(error, "تعذر تحديث حالة القيد."),
            persistent: true,
          }),
        },
      );
    } catch {
      // handled by unified messages
    }
  };

  const handleDelete = async (enrollment: StudentEnrollmentListItem) => {
    if (!canDelete) {
      notify.warning("لا تملك الصلاحية المطلوبة: student-enrollments.delete.");
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف قيد الطالب ${enrollment.student.fullName} للسنة ${enrollment.academicYear.code}؟`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await notify.promise(() => deleteMutation.mutateAsync(enrollment.id), {
        loading: `جارٍ حذف قيد الطالب ${enrollment.student.fullName}...`,
        success: "تم حذف قيد الطالب بنجاح.",
        error: (error) => ({
          message: getErrorMessage(error, "تعذر حذف قيد الطالب."),
          persistent: true,
        }),
      });
      if (editingEnrollmentId === enrollment.id) {
        resetForm();
      }
    } catch (error) {
      if (editingEnrollmentId === enrollment.id) {
        setFormError(getErrorMessage(error, "تعذر حذف قيد الطالب."));
      }
    }
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
    setSelectedStudentFilterOption(null);
    setFilterDraftStudentOption(null);
    setIsFilterOpen(false);
  };

  const handleOpenDistributionBoard = (enrollment: StudentEnrollmentListItem) => {
    const gradeLevelId =
      enrollment.gradeLevelId ?? enrollment.gradeLevel?.id ?? enrollment.section?.gradeLevel.id;

    if (!gradeLevelId) {
      const message = "لا يمكن فتح شاشة التوزيع قبل توفر الصف على هذا القيد.";
      setFormError(message);
      notify.warning(message);
      return;
    }

    const query = new URLSearchParams({
      academicYearId: enrollment.academicYearId,
      gradeLevelId,
    });
    router.push(`/app/student-distributions?${query.toString()}`);
  };

  const handleReturnToPendingDistribution = async (enrollment: StudentEnrollmentListItem) => {
    if (!canUpdate) {
      notify.warning("لا تملك الصلاحية المطلوبة: student-enrollments.update.");
      return;
    }

    const gradeLevelId =
      enrollment.gradeLevelId ?? enrollment.gradeLevel?.id ?? enrollment.section?.gradeLevel.id;

    if (!gradeLevelId) {
      const message = "لا يمكن إعادة القيد إلى الانتظار قبل معرفة الصف المرتبط به.";
      setFormError(message);
      notify.warning(message);
      return;
    }

    try {
      await notify.promise(
        () =>
          updateMutation.mutateAsync({
            enrollmentId: enrollment.id,
            payload: {
              gradeLevelId,
              sectionId: "",
              distributionStatus: "PENDING_DISTRIBUTION",
            },
          }),
        {
          loading: "جارٍ إعادة القيد إلى انتظار التوزيع...",
          success: "تمت إعادة القيد إلى انتظار التوزيع بنجاح.",
          error: (error) => ({
            message: getErrorMessage(error, "تعذر إعادة القيد إلى انتظار التوزيع."),
            persistent: true,
          }),
        },
      );
    } catch {
      // handled by unified messages
    }
  };

  const handleRefresh = async () => {
    try {
      await notify.promise(async () => {
        const result = await enrollmentsQuery.refetch();
        if (result.error) {
          throw result.error;
        }
        return result;
      }, {
        loading: "جارٍ تحديث قيود الطلاب...",
        success: "تم تحديث قيود الطلاب.",
        error: (error) => ({
          message: getErrorMessage(error, "تعذّر تحميل بيانات قيود الطلاب."),
          persistent: true,
        }),
      });
    } catch {
      // handled by unified messages
    }
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
    setSelectedStudentFilterOption(filterDraftStudentOption);
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

  const hasActiveFilters = activeFiltersCount > 0;
  const inlineMessageProps = {
    colorMode: preferences.colorMode,
    variant: preferences.variant,
    dismissible: false,
  } as const;
  const emptyStateMessage = hasActiveFilters
    ? "لا توجد نتائج مطابقة للفلاتر الحالية."
    : canCreate
      ? "لا توجد قيود طلاب بعد. يمكنك البدء بإنشاء أول قيد."
      : "لا توجد قيود طلاب متاحة حاليًا.";

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالطالب/رقم الطالب/رقم القيد السنوي/الصف/الشعبة/السنة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
            open={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
          title="فلاتر القيود"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="الطالب">
              <StudentPickerSheet
                scope="student-enrollments"
                variant="filter"
                value={filterDraft.student}
                selectedOption={filterDraftStudentOption}
                onSelect={(option) => {
                  setFilterDraft((prev) => ({ ...prev, student: option?.id ?? "all" }));
                  setFilterDraftStudentOption(option);
                }}
                disabled={!canReadStudents}
              />
            </FormField>

            <FormField label="السنة الأكاديمية">
              <SelectField
                icon={<CalendarDays />}
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
            </FormField>

            <FormField label="الصف">
              <SelectField
                icon={<GraduationCap />}
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
            </FormField>

            <FormField label="الشعبة">
              <SelectField
                icon={<GraduationCap />}
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
            </FormField>

            <FormField label="الحالة">
              <SelectField
                icon={<Activity />}
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
            </FormField>

            <FormField label="حالة التوزيع">
              <SelectField
                icon={<ArrowRightLeft />}
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
            </FormField>

            <FormField label="التفعيل">
              <SelectField
                icon={<Activity />}
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
            </FormField>
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
          {formError && !isFormOpen ? (
            <SystemMessageInline
              tone="warning"
              message={formError}
              densityPreset={preferences.densityPreset}
              {...inlineMessageProps}
            />
          ) : null}

          {enrollmentsQuery.isPending ? (
            <SystemMessageInline
              tone="loading"
              message="جارٍ تحميل بيانات قيود الطلاب..."
              densityPreset={preferences.densityPreset}
              {...inlineMessageProps}
            />
          ) : null}

          {enrollmentsQuery.error ? (
            <SystemMessageInline
              tone="error"
              message={getErrorMessage(enrollmentsQuery.error, "تعذّر تحميل البيانات.")}
              densityPreset={preferences.densityPreset}
              action={{ label: "إعادة المحاولة", dismissOnClick: false }}
              onAction={() => void handleRefresh()}
              {...inlineMessageProps}
            />
          ) : null}

          {!enrollmentsQuery.isPending && !enrollmentsQuery.error && enrollments.length === 0 ? (
            <SystemMessageInline
              tone="neutral"
              message={emptyStateMessage}
              densityPreset={preferences.densityPreset}
              action={
                hasActiveFilters
                  ? { label: "مسح الفلاتر", dismissOnClick: false }
                  : canCreate
                    ? { label: "إنشاء قيد", dismissOnClick: false }
                    : undefined
              }
              onAction={
                hasActiveFilters
                  ? clearFilters
                  : canCreate
                    ? handleStartCreate
                    : undefined
              }
              {...inlineMessageProps}
            />
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
                onClick={() => void handleRefresh()}
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
          <SystemMessageInline
            tone="warning"
            message="لا تملك الصلاحية المطلوبة: student-enrollments.create."
            densityPreset={preferences.densityPreset}
            {...inlineMessageProps}
          />
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="الطالب" required>
              <StudentPickerSheet
                scope="student-enrollments"
                variant="form"
                value={formState.studentId}
                selectedOption={selectedFormStudent}
                onSelect={(option) => {
                  setSelectedFormStudent(option);
                  setFormState((prev) => ({
                    ...prev,
                    studentId: option?.id ?? "",
                  }));
                }}
                disabled={!canReadStudents}
              />
            </FormField>

            <FormField label="السنة الأكاديمية" required>
              <SelectField
                icon={<CalendarDays />}
                value={formState.academicYearId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                disabled={!canReadAcademicYears}
                required
              >
                <option value="">اختر السنة الدراسية</option>
                {(academicYearsQuery.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} ({year.code})
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="الصف" required>
              <SelectField
                icon={<GraduationCap />}
                value={formState.gradeLevelId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    gradeLevelId: event.target.value,
                    sectionId: "",
                  }))
                }
                disabled={!canReadGradeLevels || gradeLevelsQuery.isLoading}
                required
              >
                <option value="">اختر الصف</option>
                {gradeLevelOptions.map((gradeLevel) => (
                  <option key={gradeLevel.id} value={gradeLevel.id}>
                    {gradeLevel.name} ({gradeLevel.code})
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField
              label="الشعبة"
              required={requiresSection}
              hint={
                !requiresSection
                  ? "يمكن ترك الشعبة فارغة عندما تكون حالة التوزيع بانتظار التوزيع."
                  : undefined
              }
            >
              <SelectField
                icon={<GraduationCap />}
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
                required={requiresSection}
              >
                <option value="">
                  {requiresSection ? "اختر الشعبة" : "سيتم التوزيع لاحقًا"}
                </option>
                {formSectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name} ({section.code})
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="رقم القيد السنوي">
              <Input
                icon={<Hash />}
                value={formState.yearlyEnrollmentNo}
                readOnly
                placeholder="سيُولد تلقائيًا عند الحفظ"
                className="bg-muted/40"
              />
            </FormField>

            <FormField
              label="حالة التوزيع"
              hint='رقم القيد السنوي سيُولد تلقائيًا عند الحفظ. عند اختيار "بانتظار التوزيع" سيُحفظ القيد على مستوى الصف فقط بدون شعبة، ويمكن إسناده لاحقًا من شاشة التوزيع.'
            >
              <SelectField
                icon={<ArrowRightLeft />}
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
              </SelectField>
            </FormField>

            <FormField label="تاريخ القيد">
              <Input
                icon={<CalendarDays />}
                type="date"
                value={formState.enrollmentDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, enrollmentDate: event.target.value }))
                }
              />
            </FormField>

            <FormField label="الحالة" required>
              <SelectField
                icon={<Activity />}
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as StudentEnrollmentStatus,
                  }))
                }
                required
              >
                {enrollmentStatusOptions.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.nameAr}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="ملاحظات">
              <TextareaField
                icon={<Type />}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="منقول من مدرسة أخرى"
                rows={3}
              />
            </FormField>

            <FormBooleanField
              label="نشط"
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, isActive: checked }))
              }
            />

            {formError ? (
              <SystemMessageInline
                tone="warning"
                message={formError}
                densityPreset="compact"
                {...inlineMessageProps}
              />
            ) : null}

            {!hasDependenciesReadPermissions ? (
              <SystemMessageInline
                tone="neutral"
                message="يتطلب هذا الجزء صلاحيات القراءة: students.read, academic-years.read, grade-levels.read, sections.read."
                densityPreset="compact"
                {...inlineMessageProps}
              />
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







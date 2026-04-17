"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Activity,
  ArrowUpDown,
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
import { EntityDetailsShell } from "@/presentation/entity-surface/entity-details-shell";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceGrid } from "@/presentation/entity-surface/entity-surface-grid";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import { getEntitySurfaceDefinition } from "@/presentation/entity-surface/entity-surface-registry";
import { EntitySurfaceRow } from "@/presentation/entity-surface/entity-surface-row";
import type {
  EntityDetailsMode,
  EntitySurfaceQuickAction,
  EntitySurfaceViewMode,
} from "@/presentation/entity-surface/entity-surface-types";
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
import { SortTriggerButton } from "@/components/ui/sort-trigger-button";
import { TextareaField } from "@/components/ui/textarea-field";
import { useEntitySurface } from "@/hooks/use-entity-surface";
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
import { StudentEnrollmentDetailsContent } from "@/features/student-enrollments/components/student-enrollment-details-content";
import {
  buildStudentEnrollmentSurfacePreview,
  getStudentEnrollmentDetailsPath,
  getStudentEnrollmentStatusChips,
  studentEnrollmentSurfaceDefinition,
} from "@/features/student-enrollments/presentation/student-enrollment-surface-definition";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import { cn } from "@/lib/utils";
import type {
  StudentEnrollmentDistributionStatus,
  StudentEnrollmentGroupBy,
  StudentEnrollmentListItem,
  StudentEnrollmentSortBy,
  StudentEnrollmentSortDirection,
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

type EnrollmentSortCriterion = {
  sortBy: StudentEnrollmentSortBy | "NONE";
  sortDirection: StudentEnrollmentSortDirection;
};

type EnrollmentSortState = {
  criteria: EnrollmentSortCriterion[];
  groupByCriteria: StudentEnrollmentGroupBy[];
};

type EnrollmentGroupedItems = {
  key: string;
  label: string;
  items: StudentEnrollmentListItem[];
};

type EnrollmentSortOption = {
  value: StudentEnrollmentSortBy | "NONE";
  label: string;
  ascendingLabel: string;
  descendingLabel: string;
};

type EnrollmentGroupOption = {
  value: StudentEnrollmentGroupBy;
  label: string;
};

type EnrollmentSortSlot = {
  id: string;
  label: string;
};

type EnrollmentGroupSlot = {
  id: string;
  label: string;
};

const BASE_SORT_SLOTS: EnrollmentSortSlot[] = [
  { id: "primary", label: "المعيار الأول" },
  { id: "secondary", label: "المعيار الثاني" },
  { id: "tertiary", label: "المعيار الثالث" },
];

const BASE_GROUP_SLOTS: EnrollmentGroupSlot[] = [
  { id: "primary-group", label: "التجميع الأول" },
];

const ENROLLMENT_SORT_OPTIONS: EnrollmentSortOption[] = [
  {
    value: "ACADEMIC_YEAR_START_DATE",
    label: "السنة الأكاديمية",
    ascendingLabel: "الأقدم أولًا",
    descendingLabel: "الأحدث أولًا",
  },
  {
    value: "ENROLLMENT_DATE",
    label: "تاريخ القيد",
    ascendingLabel: "الأقدم أولًا",
    descendingLabel: "الأحدث أولًا",
  },
  {
    value: "STUDENT_NAME",
    label: "اسم الطالب",
    ascendingLabel: "أ إلى ي",
    descendingLabel: "ي إلى أ",
  },
  {
    value: "ADMISSION_NO",
    label: "رقم الطالب",
    ascendingLabel: "الأصغر أولًا",
    descendingLabel: "الأكبر أولًا",
  },
  {
    value: "YEARLY_ENROLLMENT_NO",
    label: "رقم القيد السنوي",
    ascendingLabel: "الأصغر أولًا",
    descendingLabel: "الأكبر أولًا",
  },
  {
    value: "GRADE_LEVEL",
    label: "الصف",
    ascendingLabel: "الأدنى أولًا",
    descendingLabel: "الأعلى أولًا",
  },
  {
    value: "SECTION_NAME",
    label: "الشعبة",
    ascendingLabel: "أ إلى ي",
    descendingLabel: "ي إلى أ",
  },
  {
    value: "STATUS",
    label: "حالة القيد",
    ascendingLabel: "أ إلى ي",
    descendingLabel: "ي إلى أ",
  },
  {
    value: "DISTRIBUTION_STATUS",
    label: "حالة التوزيع",
    ascendingLabel: "أ إلى ي",
    descendingLabel: "ي إلى أ",
  },
  {
    value: "ACTIVE_STATE",
    label: "التفعيل",
    ascendingLabel: "غير النشط أولًا",
    descendingLabel: "النشط أولًا",
  },
  {
    value: "CREATED_AT",
    label: "تاريخ الإنشاء",
    ascendingLabel: "الأقدم أولًا",
    descendingLabel: "الأحدث أولًا",
  },
  {
    value: "UPDATED_AT",
    label: "آخر تحديث",
    ascendingLabel: "الأقدم أولًا",
    descendingLabel: "الأحدث أولًا",
  },
];

const NONE_SORT_OPTION: EnrollmentSortOption = {
  value: "NONE",
  label: "بدون معيار",
  ascendingLabel: "تصاعدي",
  descendingLabel: "تنازلي",
};

const AVAILABLE_SORT_OPTIONS: EnrollmentSortOption[] = [
  NONE_SORT_OPTION,
  ...ENROLLMENT_SORT_OPTIONS,
];

const GROUP_BY_OPTIONS: EnrollmentGroupOption[] = [
  { value: "NONE", label: "بدون تجميع" },
  { value: "ACADEMIC_YEAR_START_DATE", label: "تجميع حسب السنة الأكاديمية" },
  { value: "ENROLLMENT_DATE", label: "تجميع حسب تاريخ القيد" },
  { value: "STUDENT_NAME", label: "تجميع حسب اسم الطالب" },
  { value: "ADMISSION_NO", label: "تجميع حسب رقم الطالب" },
  { value: "YEARLY_ENROLLMENT_NO", label: "تجميع حسب رقم القيد السنوي" },
  { value: "GRADE_LEVEL", label: "تجميع حسب الصف" },
  { value: "SECTION_NAME", label: "تجميع حسب الشعبة" },
  { value: "STATUS", label: "تجميع حسب حالة القيد" },
  { value: "DISTRIBUTION_STATUS", label: "تجميع حسب حالة التوزيع" },
  { value: "ACTIVE_STATE", label: "تجميع حسب التفعيل" },
  { value: "CREATED_AT", label: "تجميع حسب تاريخ الإنشاء" },
  { value: "UPDATED_AT", label: "تجميع حسب آخر تحديث" },
];

function getDefaultSortCriteria(): EnrollmentSortCriterion[] {
  return [
    {
      sortBy: "ACADEMIC_YEAR_START_DATE",
      sortDirection: "desc",
    },
    {
      sortBy: "NONE",
      sortDirection: "asc",
    },
    {
      sortBy: "NONE",
      sortDirection: "asc",
    },
  ];
}

function getSortSlotLabel(index: number): string {
  if (index < BASE_SORT_SLOTS.length) {
    return BASE_SORT_SLOTS[index]?.label ?? `المعيار ${index + 1}`;
  }

  return `معيار إضافي ${index - BASE_SORT_SLOTS.length + 1}`;
}

function getGroupSlotLabel(index: number): string {
  if (index < BASE_GROUP_SLOTS.length) {
    return BASE_GROUP_SLOTS[index]?.label ?? `التجميع ${index + 1}`;
  }

  return `تجميع إضافي ${index - BASE_GROUP_SLOTS.length + 1}`;
}

function createDefaultSortState(): EnrollmentSortState {
  return {
    criteria: getDefaultSortCriteria(),
    groupByCriteria: ["NONE"],
  };
}

function resolveEnrollmentViewMode(
  requestedMode: EntitySurfaceViewMode,
  allowedViewModes: EntitySurfaceViewMode[] | undefined,
  fallbackMode: EntitySurfaceViewMode,
): EntitySurfaceViewMode {
  if (!allowedViewModes || allowedViewModes.length === 0) {
    return requestedMode;
  }

  if (allowedViewModes.includes(requestedMode)) {
    return requestedMode;
  }

  return allowedViewModes.includes(fallbackMode) ? fallbackMode : allowedViewModes[0];
}

function resolveEnrollmentDetailsMode(
  requestedMode: string,
  currentViewMode: EntitySurfaceViewMode,
  defaultMode: EntityDetailsMode,
): EntityDetailsMode {
  if (requestedMode === "screen-default") {
    return currentViewMode === "dense-row" ? "inline" : defaultMode;
  }

  return requestedMode as EntityDetailsMode;
}

function sanitizeSortState(sortState: EnrollmentSortState): EnrollmentSortState {
  const uniqueCriteria: EnrollmentSortCriterion[] = [];
  const seen = new Set<StudentEnrollmentSortBy>();

  for (const criterion of sortState.criteria) {
    if (criterion.sortBy === "NONE") {
      continue;
    }

    if (seen.has(criterion.sortBy)) {
      continue;
    }

    seen.add(criterion.sortBy);
    uniqueCriteria.push(criterion);
  }

  const normalizedCriteria =
    uniqueCriteria.length > 0 ? uniqueCriteria : [getDefaultSortCriteria()[0]];

  while (normalizedCriteria.length < BASE_SORT_SLOTS.length) {
    normalizedCriteria.push({
      sortBy: "NONE",
      sortDirection: "asc",
    });
  }

  const uniqueGroupByCriteria = sortState.groupByCriteria.filter(
    (groupBy, index, array) => groupBy !== "NONE" && array.indexOf(groupBy) === index,
  );
  const normalizedGroupByCriteria: StudentEnrollmentGroupBy[] =
    uniqueGroupByCriteria.length > 0 ? uniqueGroupByCriteria : ["NONE"];

  return {
    criteria: normalizedCriteria,
    groupByCriteria: normalizedGroupByCriteria,
  };
}

function getSortOption(sortBy: EnrollmentSortCriterion["sortBy"]): EnrollmentSortOption {
  return AVAILABLE_SORT_OPTIONS.find((option) => option.value === sortBy) ?? NONE_SORT_OPTION;
}

function getAvailableSortOptions(
  criteria: EnrollmentSortCriterion[],
  currentIndex: number,
): EnrollmentSortOption[] {
  const selectedValues = new Set<StudentEnrollmentSortBy>(
    criteria.flatMap((criterion, index) =>
      index === currentIndex || criterion.sortBy === "NONE" ? [] : [criterion.sortBy],
    ),
  );

  return AVAILABLE_SORT_OPTIONS.filter(
    (option) => option.value === "NONE" || !selectedValues.has(option.value),
  );
}

function getAvailableGroupOptions(
  groupByCriteria: StudentEnrollmentGroupBy[],
  currentIndex: number,
): EnrollmentGroupOption[] {
  const selectedValues = new Set<StudentEnrollmentGroupBy>(
    groupByCriteria.flatMap((groupBy, index) =>
      index === currentIndex || groupBy === "NONE" ? [] : [groupBy],
    ),
  );

  return GROUP_BY_OPTIONS.filter(
    (option) => option.value === "NONE" || !selectedValues.has(option.value),
  );
}

const DEFAULT_SORT_STATE: EnrollmentSortState = createDefaultSortState();

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

function getEnrollmentGroupKey(
  enrollment: StudentEnrollmentListItem,
  groupBy: StudentEnrollmentGroupBy,
  getStatusLabel: (value: StudentEnrollmentStatus) => string,
  getDistributionStatusLabel: (value: StudentEnrollmentDistributionStatus) => string,
): string {
  switch (groupBy) {
    case "ACADEMIC_YEAR_START_DATE":
      return `${enrollment.academicYear.name} (${enrollment.academicYear.code})`;
    case "ENROLLMENT_DATE":
      return formatDate(enrollment.enrollmentDate);
    case "STUDENT_NAME":
      return enrollment.student.fullName;
    case "ADMISSION_NO":
      return enrollment.student.admissionNo ?? "بدون رقم طالب";
    case "YEARLY_ENROLLMENT_NO":
      return enrollment.yearlyEnrollmentNo ?? "بدون رقم قيد سنوي";
    case "GRADE_LEVEL":
      return (
        enrollment.gradeLevel?.name ??
        enrollment.section?.gradeLevel.name ??
        "غير محدد"
      );
    case "SECTION_NAME":
      return enrollment.section?.name ?? "غير موزع";
    case "STATUS":
      return getStatusLabel(enrollment.status);
    case "DISTRIBUTION_STATUS":
      return enrollment.distributionStatus
        ? getDistributionStatusLabel(enrollment.distributionStatus)
        : "غير محددة";
    case "ACTIVE_STATE":
      return enrollment.isActive ? "نشط" : "غير نشط";
    case "CREATED_AT":
      return formatDate(enrollment.createdAt);
    case "UPDATED_AT":
      return formatDate(enrollment.updatedAt);
    case "NONE":
    default:
      return "كل القيود";
  }
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
  const entitySurface = useEntitySurface();
  const { hasPermission } = useRbac();
  const { notify, preferences } = useSystemMessage();
  const enrollmentsSurface = React.useMemo(
    () =>
      getEntitySurfaceDefinition<StudentEnrollmentListItem>("student-enrollments") ??
      studentEnrollmentSurfaceDefinition,
    [],
  );
  const canCreate = hasPermission("student-enrollments.create");
  const canUpdate = hasPermission("student-enrollments.update");
  const canDelete = hasPermission("student-enrollments.delete");
  const canReadDetails = hasPermission("student-enrollments.read");
  const canUseQuickActions = canReadDetails || canUpdate || canDelete;
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
  const [selectedEnrollmentId, setSelectedEnrollmentId] = React.useState<string | null>(null);
  const [contextEnrollmentId, setContextEnrollmentId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [sortState, setSortState] = React.useState<EnrollmentSortState>(DEFAULT_SORT_STATE);
  const [sortDraft, setSortDraft] = React.useState<EnrollmentSortState>(DEFAULT_SORT_STATE);
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
    sortBy: sortState.criteria.flatMap((criterion) =>
      criterion.sortBy === "NONE" ? [] : [criterion.sortBy],
    ),
    sortDirection: sortState.criteria.flatMap((criterion) =>
      criterion.sortBy === "NONE" ? [] : [criterion.sortDirection],
    ),
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
  const selectedEnrollment = React.useMemo(
    () => enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId) ?? null,
    [enrollments, selectedEnrollmentId],
  );
  const contextEnrollment = React.useMemo(
    () => enrollments.find((enrollment) => enrollment.id === contextEnrollmentId) ?? null,
    [contextEnrollmentId, enrollments],
  );
  const resolvedViewMode = React.useMemo(
    () =>
      resolveEnrollmentViewMode(
        entitySurface.defaultViewMode,
        enrollmentsSurface.allowedViewModes,
        enrollmentsSurface.defaultViewMode ?? "list",
      ),
    [
      enrollmentsSurface.allowedViewModes,
      enrollmentsSurface.defaultViewMode,
      entitySurface.defaultViewMode,
    ],
  );
  const enrollmentDetailsMode = React.useMemo(
    () =>
      resolveEnrollmentDetailsMode(
        entitySurface.detailsOpenMode,
        resolvedViewMode,
        enrollmentsSurface.detailsMode ?? "sheet",
      ),
    [entitySurface.detailsOpenMode, enrollmentsSurface.detailsMode, resolvedViewMode],
  );
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

  React.useEffect(() => {
    if (selectedEnrollmentId && !enrollments.some((item) => item.id === selectedEnrollmentId)) {
      setSelectedEnrollmentId(null);
    }

    if (contextEnrollmentId && !enrollments.some((item) => item.id === contextEnrollmentId)) {
      setContextEnrollmentId(null);
    }
  }, [contextEnrollmentId, enrollments, selectedEnrollmentId]);

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

  React.useEffect(() => {
    if (!isSortOpen) {
      return;
    }

    setSortDraft(sortState);
  }, [isSortOpen, sortState]);

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
      if (selectedEnrollmentId === enrollment.id) {
        setSelectedEnrollmentId(null);
      }
      if (contextEnrollmentId === enrollment.id) {
        setContextEnrollmentId(null);
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
  const groupedEnrollments = React.useMemo<EnrollmentGroupedItems[]>(() => {
    const activeGroupByCriteria = sortState.groupByCriteria.filter(
      (groupBy) => groupBy !== "NONE",
    );

    if (activeGroupByCriteria.length === 0) {
      return [
        {
          key: "all",
          label: "كل القيود",
          items: enrollments,
        },
      ];
    }

    const buildGroups = (
      items: StudentEnrollmentListItem[],
      criteria: StudentEnrollmentGroupBy[],
      path: string[] = [],
    ): EnrollmentGroupedItems[] => {
      const [currentCriterion, ...restCriteria] = criteria;

      if (!currentCriterion) {
        return [
          {
            key: path.join("::"),
            label: path.join(" / "),
            items,
          },
        ];
      }

      const groups = new Map<string, StudentEnrollmentListItem[]>();

      for (const enrollment of items) {
        const key = getEnrollmentGroupKey(
          enrollment,
          currentCriterion,
          getStatusLabel,
          getDistributionStatusLabel,
        );

        if (!groups.has(key)) {
          groups.set(key, []);
        }

        groups.get(key)?.push(enrollment);
      }

      return Array.from(groups.entries()).flatMap(([key, groupedItems]) =>
        buildGroups(groupedItems, restCriteria, [...path, key]),
      );
    };

    return buildGroups(enrollments, activeGroupByCriteria);
  }, [
    enrollments,
    getDistributionStatusLabel,
    getStatusLabel,
    sortState.groupByCriteria,
  ]);

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

  const clearSorting = () => {
    setPage(1);
    setSortState(DEFAULT_SORT_STATE);
    setSortDraft(DEFAULT_SORT_STATE);
    setIsSortOpen(false);
  };

  const handleAddSortCriterion = () => {
    setSortDraft((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          sortBy: "NONE",
          sortDirection: "asc",
        },
      ],
    }));
  };

  const handleAddGroupCriterion = () => {
    setSortDraft((prev) => ({
      ...prev,
      groupByCriteria: [...prev.groupByCriteria, "NONE"],
    }));
  };

  const handleRemoveSortCriterion = (index: number) => {
    setSortDraft((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleRemoveGroupCriterion = (index: number) => {
    setSortDraft((prev) => ({
      ...prev,
      groupByCriteria: prev.groupByCriteria.filter((_, itemIndex) => itemIndex !== index),
    }));
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

  const handleOpenEnrollmentDetails = React.useCallback(
    (enrollment: StudentEnrollmentListItem) => {
      setContextEnrollmentId(null);

      if (!canReadDetails) {
        return;
      }

      if (enrollmentDetailsMode === "page") {
        router.push(getStudentEnrollmentDetailsPath(enrollment));
        return;
      }

      setSelectedEnrollmentId(enrollment.id);
    },
    [canReadDetails, enrollmentDetailsMode, router],
  );

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

  const buildEnrollmentQuickActions = React.useCallback(
    (enrollment: StudentEnrollmentListItem): EntitySurfaceQuickAction[] => {
      if (!canUseQuickActions) {
        return [];
      }

      const actions: EntitySurfaceQuickAction[] = [];

      if (canReadDetails) {
        actions.push({
          key: "details",
          label: "تفاصيل",
          icon: <Type className="h-3.5 w-3.5" />,
          tone: "accent",
          onClick: () => handleOpenEnrollmentDetails(enrollment),
        });
      }

      actions.push({
        key: "distribution",
        label: "شاشة التوزيع",
        icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
        tone: "ghost",
        onClick: () => handleOpenDistributionBoard(enrollment),
      });

      if (enrollment.sectionId && canUpdate) {
        actions.push({
          key: "return-pending",
          label: "إرجاع للانتظار",
          icon: <Undo2 className="h-3.5 w-3.5" />,
          tone: "ghost",
          onClick: () => void handleReturnToPendingDistribution(enrollment),
          disabled: updateMutation.isPending,
        });
      }

      if (canUpdate) {
        actions.push(
          {
            key: "edit",
            label: "تعديل",
            icon: <PencilLine className="h-3.5 w-3.5" />,
            onClick: () => handleStartEdit(enrollment),
            disabled: updateMutation.isPending,
          },
          {
            key: "toggle-active",
            label: enrollment.isActive ? "تعطيل" : "تفعيل",
            icon: <Activity className="h-3.5 w-3.5" />,
            tone: "ghost",
            onClick: () => handleToggleActive(enrollment),
            disabled: updateMutation.isPending,
          },
        );
      }

      if (canDelete) {
        actions.push({
          key: "delete",
          label: "حذف",
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: "danger",
          onClick: () => handleDelete(enrollment),
          disabled: deleteMutation.isPending,
        });
      }

      return actions;
    },
    [
      canDelete,
      canReadDetails,
      canUpdate,
      canUseQuickActions,
      deleteMutation.isPending,
      handleOpenDistributionBoard,
      handleOpenEnrollmentDetails,
      updateMutation.isPending,
    ],
  );

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

  const applySorting = () => {
    setPage(1);
    setSortState(sanitizeSortState(sortDraft));
    setIsSortOpen(false);
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
  const activeSortCount = React.useMemo(() => {
    const activeCriteria = sortState.criteria.filter(
      (criterion) => criterion.sortBy !== "NONE",
    );
    const hasDefaultOnly =
      activeCriteria.length === 1 &&
      activeCriteria[0]?.sortBy === "ACADEMIC_YEAR_START_DATE" &&
      activeCriteria[0]?.sortDirection === "desc" &&
      sortState.groupByCriteria.every((groupBy) => groupBy === "NONE");

    if (hasDefaultOnly) {
      return 0;
    }

    return (
      activeCriteria.length +
      sortState.groupByCriteria.filter((groupBy) => groupBy !== "NONE").length
    );
  }, [sortState]);
  const usesBlurBackdrop = entitySurface.longPressMode === "enabled-with-blur";
  const contextEnrollmentQuickActions = contextEnrollment
    ? buildEnrollmentQuickActions(contextEnrollment)
    : [];
  const selectedEnrollmentQuickActions = selectedEnrollment
    ? buildEnrollmentQuickActions(selectedEnrollment).filter((action) => action.key !== "details")
    : [];
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
          beforeFilterActions={
            <SortTriggerButton
              count={activeSortCount}
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-label="فرز قيود الطلاب"
            />
          }
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isSortOpen}
          onClose={() => setIsSortOpen(false)}
          eyebrow="فرز"
          title="فرز القيود"
          actionButtons={
            <FilterDrawerActions
              onClear={clearSorting}
              onApply={applySorting}
              clearLabel="الافتراضي"
              applyLabel="تطبيق الفرز"
            />
          }
        >
          <div className="space-y-3">
            {sortDraft.criteria.map((criterion, index) => {
              const slotLabel = getSortSlotLabel(index);
              const availableOptions = getAvailableSortOptions(sortDraft.criteria, index);
              const sortOption = getSortOption(criterion.sortBy);

              return (
                <div
                  key={`sort-criterion-${index}`}
                  className="grid gap-3 rounded-[1.35rem] border border-border/60 bg-background/60 p-3 sm:grid-cols-2"
                >
                  <FormField label={slotLabel}>
                    <SelectField
                      icon={<ArrowUpDown />}
                      value={criterion.sortBy}
                      onChange={(event) =>
                        setSortDraft((prev) => ({
                          ...prev,
                          criteria: prev.criteria.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  sortBy: event.target.value as StudentEnrollmentSortBy | "NONE",
                                }
                              : item,
                          ),
                        }))
                      }
                    >
                      {availableOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  <FormField label="الاتجاه">
                    <SelectField
                      icon={<ArrowUpDown />}
                      value={criterion.sortDirection}
                      disabled={criterion.sortBy === "NONE"}
                      onChange={(event) =>
                        setSortDraft((prev) => ({
                          ...prev,
                          criteria: prev.criteria.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  sortDirection: event.target.value as StudentEnrollmentSortDirection,
                                }
                              : item,
                          ),
                        }))
                      }
                    >
                      <option value="asc">{sortOption.ascendingLabel}</option>
                      <option value="desc">{sortOption.descendingLabel}</option>
                    </SelectField>
                  </FormField>

                  {index >= BASE_SORT_SLOTS.length ? (
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleRemoveSortCriterion(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        إزالة هذا المعيار
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {sortDraft.criteria.length < ENROLLMENT_SORT_OPTIONS.length ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-[1.35rem]"
                onClick={handleAddSortCriterion}
              >
                <Plus className="h-4 w-4" />
                إضافة معيار آخر
              </Button>
            ) : null}

            <div className="space-y-3 rounded-[1.35rem] border border-border/60 bg-background/60 p-3">
              {sortDraft.groupByCriteria.map((groupBy, index) => {
                const slotLabel = getGroupSlotLabel(index);
                const availableOptions = getAvailableGroupOptions(
                  sortDraft.groupByCriteria,
                  index,
                );

                return (
                  <div key={`group-criterion-${index}`} className="space-y-3">
                    <FormField label={slotLabel}>
                      <SelectField
                        icon={<ArrowUpDown />}
                        value={groupBy}
                        onChange={(event) =>
                          setSortDraft((prev) => ({
                            ...prev,
                            groupByCriteria: prev.groupByCriteria.map((item, itemIndex) =>
                              itemIndex === index
                                ? (event.target.value as StudentEnrollmentGroupBy)
                                : item,
                            ),
                          }))
                        }
                      >
                        {availableOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>

                    {index >= BASE_GROUP_SLOTS.length ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleRemoveGroupCriterion(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        إزالة هذا التجميع
                      </Button>
                    ) : null}
                  </div>
                );
              })}

              {sortDraft.groupByCriteria.length < GROUP_BY_OPTIONS.length - 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 rounded-[1.35rem]"
                  onClick={handleAddGroupCriterion}
                >
                  <Plus className="h-4 w-4" />
                  إضافة تجميع بحسب
                </Button>
              ) : null}
            </div>
          </div>
        </FilterDrawer>

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

          {groupedEnrollments.map((group) => (
            <div key={group.key} className="space-y-3">
              {sortState.groupByCriteria.some((groupBy) => groupBy !== "NONE") ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.1rem] border border-[color:var(--app-accent-strong)]/40 bg-[color:var(--app-accent-soft)]/30 px-3 py-2">
                  <p className="text-sm font-semibold text-[color:var(--app-accent-color)]">
                    {group.label}
                  </p>
                  <Badge variant="outline">العناصر: {group.items.length}</Badge>
                </div>
              ) : null}

              <EntitySurfaceGrid
                viewMode={resolvedViewMode}
                density={entitySurface.density}
                richness={entitySurface.richness}
                colorMode={entitySurface.colorMode}
                visualStyle={entitySurface.visualStyle}
                effectsPreset={entitySurface.effectsPreset}
                shapePreset={entitySurface.shapePreset}
                inlineActionsMode={entitySurface.inlineActionsMode}
              >
                {group.items.map((enrollment) => {
                  const preview =
                    enrollmentsSurface.buildPreview?.(enrollment) ??
                    buildStudentEnrollmentSurfacePreview(enrollment);
                  const quickActions = buildEnrollmentQuickActions(enrollment);
                  const visibleQuickActions = quickActions.length > 0 ? quickActions : undefined;
                  const canOpenContext =
                    entitySurface.longPressMode !== "disabled" && quickActions.length > 0;
                  const handleCardClick = canReadDetails
                    ? () => handleOpenEnrollmentDetails(enrollment)
                    : undefined;

                  if (resolvedViewMode === "dense-row") {
                    return (
                      <EntitySurfaceRow
                        key={enrollment.id}
                        title={preview.title}
                        subtitle={preview.subtitle}
                        meta={preview.meta ?? preview.description}
                        avatar={preview.avatar}
                        statusChips={getStudentEnrollmentStatusChips(enrollment)}
                        quickActions={visibleQuickActions}
                        density={entitySurface.density}
                        richness={entitySurface.richness}
                        colorMode={entitySurface.colorMode}
                        visualStyle={entitySurface.visualStyle}
                        effectsPreset={entitySurface.effectsPreset}
                        shapePreset={entitySurface.shapePreset}
                        inlineActionsMode={entitySurface.inlineActionsMode}
                        motionPreset={entitySurface.motionPreset}
                        reducedMotion={entitySurface.reducedMotion}
                        longPressMode={entitySurface.longPressMode}
                        avatarMode={entitySurface.avatarMode}
                        detailsAffordance={canReadDetails}
                        contextOpen={contextEnrollmentId === enrollment.id}
                        onClick={handleCardClick}
                        onLongPress={() => {
                          if (!canOpenContext) {
                            return;
                          }
                          setContextEnrollmentId(enrollment.id);
                        }}
                      />
                    );
                  }

                  return (
                    <EntitySurfaceCard
                      key={enrollment.id}
                      title={preview.title}
                      subtitle={preview.subtitle}
                      description={preview.description}
                      avatar={preview.avatar}
                      fields={preview.fields}
                      statusChips={getStudentEnrollmentStatusChips(enrollment)}
                      quickActions={visibleQuickActions}
                      viewMode={resolvedViewMode}
                      density={entitySurface.density}
                      richness={entitySurface.richness}
                      colorMode={entitySurface.colorMode}
                      visualStyle={entitySurface.visualStyle}
                      effectsPreset={entitySurface.effectsPreset}
                      shapePreset={entitySurface.shapePreset}
                      inlineActionsMode={entitySurface.inlineActionsMode}
                      motionPreset={entitySurface.motionPreset}
                      reducedMotion={entitySurface.reducedMotion}
                      longPressMode={entitySurface.longPressMode}
                      avatarMode={entitySurface.avatarMode}
                      detailsAffordance={canReadDetails}
                      contextOpen={contextEnrollmentId === enrollment.id}
                      onClick={handleCardClick}
                      onLongPress={() => {
                        if (!canOpenContext) {
                          return;
                        }
                        setContextEnrollmentId(enrollment.id);
                      }}
                    />
                  );
                })}
              </EntitySurfaceGrid>
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

      {contextEnrollment ? (
        <div className="fixed inset-0 z-[85]">
          <div
            className={cn(
              "absolute inset-0",
              usesBlurBackdrop ? "bg-black/24 backdrop-blur-sm" : "bg-black/18",
            )}
            onClick={() => setContextEnrollmentId(null)}
          />
          <div className="absolute inset-x-4 bottom-4 mx-auto max-w-sm">
            <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-3 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">اختصارات القيد</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                {contextEnrollment.student.fullName} • {contextEnrollment.yearlyEnrollmentNo ?? "بدون رقم قيد"}
              </p>
              {contextEnrollmentQuickActions.length > 0 ? (
                <EntitySurfaceQuickActions actions={contextEnrollmentQuickActions} className="mt-3" />
              ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-white/55">
                  لا توجد اختصارات متاحة حاليًا.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedEnrollment ? (
        <EntityDetailsShell
          open
          mode={enrollmentDetailsMode}
          title={selectedEnrollment.student.fullName}
          subtitle={`${selectedEnrollment.academicYear.name} • ${selectedEnrollment.yearlyEnrollmentNo ?? "بدون رقم قيد"}`}
          statusChips={getStudentEnrollmentStatusChips(selectedEnrollment)}
          actions={selectedEnrollmentQuickActions}
          density={entitySurface.density}
          visualStyle={entitySurface.visualStyle}
          effectsPreset={entitySurface.effectsPreset}
          shapePreset={entitySurface.shapePreset}
          onClose={() => setSelectedEnrollmentId(null)}
        >
          <StudentEnrollmentDetailsContent
            enrollment={selectedEnrollment}
            quickActions={selectedEnrollmentQuickActions}
          />
        </EntityDetailsShell>
      ) : null}

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







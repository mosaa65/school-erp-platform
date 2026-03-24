"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ClipboardCheck,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { StudentPickerSheet } from "@/components/ui/student-picker-sheet";
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
import {
  useCreateStudentAttendanceMutation,
  useDeleteStudentAttendanceMutation,
  useUpdateStudentAttendanceMutation,
} from "@/features/student-attendance/hooks/use-student-attendance-mutations";
import { useStudentAttendanceQuery } from "@/features/student-attendance/hooks/use-student-attendance-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/student-attendance/hooks/use-student-enrollment-options-query";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import type {
  StudentAttendanceListItem,
  StudentAttendanceStatus,
} from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";
import { translateAttendanceStatus } from "@/lib/i18n/ar";

type AttendanceFormState = {
  studentEnrollmentId: string;
  attendanceDate: string;
  status: StudentAttendanceStatus;
  checkInAt: string;
  checkOutAt: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const STATUS_OPTIONS: StudentAttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED_ABSENCE",
  "EARLY_LEAVE",
];

const DEFAULT_FORM_STATE: AttendanceFormState = {
  studentEnrollmentId: "",
  attendanceDate: "",
  status: "PRESENT",
  checkInAt: "",
  checkOutAt: "",
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

function toDateTimeLocalInput(isoDateTime: string | null): string {
  if (!isoDateTime) {
    return "";
  }

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type EnrollmentPlacementLabelInput = {
  academicYear: {
    name: string;
    code: string;
  };
  gradeLevel?: {
    name: string;
    code: string;
  } | null;
  section?: {
    name?: string | null;
    code?: string | null;
    gradeLevel?: {
      name: string;
      code: string;
    } | null;
  } | null;
};

function formatEnrollmentPlacementLabel(
  enrollment: EnrollmentPlacementLabelInput,
): string {
  const yearLabel = formatNameCodeLabel(enrollment.academicYear.name, enrollment.academicYear.code);
  const gradeLabel = enrollment.gradeLevel
    ? formatNameCodeLabel(enrollment.gradeLevel.name, enrollment.gradeLevel.code)
    : enrollment.section?.gradeLevel
      ? formatNameCodeLabel(
          enrollment.section.gradeLevel.name,
          enrollment.section.gradeLevel.code,
        )
      : "";

  if (enrollment.section) {
    return `${yearLabel} / ${gradeLabel || "غير موزع"} / ${formatNameCodeLabel(enrollment.section.name, enrollment.section.code)}`;
  }

  return gradeLabel ? `${yearLabel} / ${gradeLabel} / غير موزع` : `${yearLabel} / غير موزع`;
}

function toFormState(attendance: StudentAttendanceListItem): AttendanceFormState {
  return {
    studentEnrollmentId: attendance.studentEnrollmentId,
    attendanceDate: toDateInput(attendance.attendanceDate),
    status: attendance.status,
    checkInAt: toDateTimeLocalInput(attendance.checkInAt),
    checkOutAt: toDateTimeLocalInput(attendance.checkOutAt),
    notes: attendance.notes ?? "",
    isActive: attendance.isActive,
  };
}

function buildStudentPickerOptionFromAttendance(
  attendance: StudentAttendanceListItem,
): StudentPickerOption {
  return {
    id: attendance.studentEnrollment.student.id,
    title: attendance.studentEnrollment.student.fullName,
    subtitle: attendance.studentEnrollment.student.admissionNo
      ? `رقم الطالب ${attendance.studentEnrollment.student.admissionNo}`
      : "بدون رقم طالب",
    meta: formatEnrollmentPlacementLabel(attendance.studentEnrollment),
    groupLabel: "الطالب المحدد",
  };
}

export function StudentAttendanceWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-attendance.create");
  const canUpdate = hasPermission("student-attendance.update");
  const canDelete = hasPermission("student-attendance.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadStudentEnrollments = hasPermission("student-enrollments.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StudentAttendanceStatus | "all">(
    "all",
  );
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    student: string;
    enrollment: string;
    status: StudentAttendanceStatus | "all";
    fromDate: string;
    toDate: string;
    active: "all" | "active" | "inactive";
  }>({
    student: "all",
    enrollment: "all",
    status: "all",
    fromDate: "",
    toDate: "",
    active: "all",
  });

  const [editingAttendanceId, setEditingAttendanceId] = React.useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<AttendanceFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedFilterStudentOption, setSelectedFilterStudentOption] =
    React.useState<StudentPickerOption | null>(null);
  const [filterDraftStudentOption, setFilterDraftStudentOption] =
    React.useState<StudentPickerOption | null>(null);
  const [selectedFormStudent, setSelectedFormStudent] = React.useState<StudentPickerOption | null>(
    null,
  );

  const attendanceQuery = useStudentAttendanceQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentEnrollmentId: enrollmentFilter === "all" ? undefined : enrollmentFilter,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    fromDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const enrollmentsQuery = useStudentEnrollmentOptionsQuery();

  const createMutation = useCreateStudentAttendanceMutation();
  const updateMutation = useUpdateStudentAttendanceMutation();
  const deleteMutation = useDeleteStudentAttendanceMutation();

  const records = React.useMemo(() => attendanceQuery.data?.data ?? [], [attendanceQuery.data?.data]);
  const pagination = attendanceQuery.data?.pagination;
  const isEditing = editingAttendanceId !== null;

  const enrollmentOptions = React.useMemo(() => {
    const selectedStudent = isFilterOpen ? filterDraft.student : studentFilter;

    return (enrollmentsQuery.data ?? []).filter((item) =>
      formState.studentEnrollmentId
        ? true
        : selectedStudent === "all" || item.student.id === selectedStudent,
    );
  }, [
    enrollmentsQuery.data,
    filterDraft.student,
    formState.studentEnrollmentId,
    isFilterOpen,
    studentFilter,
  ]);
  const formEnrollmentOptions = React.useMemo(() => {
    const selectedStudentId = selectedFormStudent?.id;

    return (enrollmentsQuery.data ?? []).filter((item) =>
      selectedStudentId ? item.student.id === selectedStudentId : true,
    );
  }, [enrollmentsQuery.data, selectedFormStudent?.id]);

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingAttendanceId);
    if (!stillExists) {
      setEditingAttendanceId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setSelectedFormStudent(null);
      setIsFormOpen(false);
    }
  }, [records, editingAttendanceId, isEditing]);

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
      enrollment: enrollmentFilter,
      status: statusFilter,
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      active: activeFilter,
    });
    setFilterDraftStudentOption(selectedFilterStudentOption);
  }, [
    activeFilter,
    enrollmentFilter,
    fromDateFilter,
    isFilterOpen,
    selectedFilterStudentOption,
    statusFilter,
    studentFilter,
    toDateFilter,
  ]);

  const resetForm = () => {
    setEditingAttendanceId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setSelectedFormStudent(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingAttendanceId(null);
    setFormState(DEFAULT_FORM_STATE);
    setSelectedFormStudent(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.studentEnrollmentId) {
      setFormError("قيد الطالب مطلوب.");
      return false;
    }

    if (!formState.attendanceDate) {
      setFormError("تاريخ الحضور مطلوب.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    if (formState.checkInAt && formState.checkOutAt) {
      const checkIn = new Date(formState.checkInAt);
      const checkOut = new Date(formState.checkOutAt);
      if (checkOut <= checkIn) {
        setFormError("وقت الخروج يجب أن يكون بعد وقت الدخول.");
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      studentEnrollmentId: formState.studentEnrollmentId,
      attendanceDate: toDateIso(formState.attendanceDate),
      status: formState.status,
      checkInAt: formState.checkInAt ? toDateTimeIso(formState.checkInAt) : undefined,
      checkOutAt: formState.checkOutAt ? toDateTimeIso(formState.checkOutAt) : undefined,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingAttendanceId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-attendance.update.");
        return;
      }

      updateMutation.mutate(
        {
          attendanceId: editingAttendanceId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: student-attendance.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (attendance: StudentAttendanceListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingAttendanceId(attendance.id);
    setFormState(toFormState(attendance));
    setSelectedFormStudent(buildStudentPickerOptionFromAttendance(attendance));
    setIsFormOpen(true);
  };

  const handleToggleActive = (attendance: StudentAttendanceListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      attendanceId: attendance.id,
      payload: {
        isActive: !attendance.isActive,
      },
    });
  };

  const handleDelete = (attendance: StudentAttendanceListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف حضور ${attendance.studentEnrollment.student.fullName} بتاريخ ${formatDate(
        attendance.attendanceDate,
      )}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(attendance.id, {
      onSuccess: () => {
        if (editingAttendanceId === attendance.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadStudentEnrollments;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStudentFilter("all");
    setEnrollmentFilter("all");
    setStatusFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setActiveFilter("all");
    setSelectedFilterStudentOption(null);
    setFilterDraftStudentOption(null);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStudentFilter(filterDraft.student);
    setEnrollmentFilter(filterDraft.enrollment);
    setStatusFilter(filterDraft.status);
    setFromDateFilter(filterDraft.fromDate);
    setToDateFilter(filterDraft.toDate);
    setActiveFilter(filterDraft.active);
    setSelectedFilterStudentOption(filterDraftStudentOption);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      studentFilter !== "all" ? 1 : 0,
      enrollmentFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      fromDateFilter ? 1 : 0,
      toDateFilter ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [
    activeFilter,
    enrollmentFilter,
    fromDateFilter,
    searchInput,
    statusFilter,
    studentFilter,
    toDateFilter,
  ]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالطالب/الرقم/ملاحظات..."
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
          title="فلاتر الحضور"
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
            <StudentPickerSheet
              scope="student-attendance"
              variant="filter"
              value={filterDraft.student}
              selectedOption={filterDraftStudentOption}
              onSelect={(option) => {
                setFilterDraft((prev) => ({
                  ...prev,
                  student: option?.id ?? "all",
                  enrollment: option ? "all" : prev.enrollment,
                }));
                setFilterDraftStudentOption(option);
              }}
              disabled={!canReadStudents}
            />

            <SelectField
              value={filterDraft.enrollment}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, enrollment: event.target.value }))
              }
              disabled={!canReadStudentEnrollments}
            >
              <option value="all">كل القيود</option>
              {enrollmentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayLabel}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.status}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  status: event.target.value as StudentAttendanceStatus | "all",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {translateAttendanceStatus(status)}
                </option>
              ))}
            </SelectField>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
              <Input
                type="date"
                value={filterDraft.fromDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, fromDate: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
              <Input
                type="date"
                value={filterDraft.toDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, toDate: event.target.value }))
                }
              />
            </div>

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
              <CardTitle>حضور الطلاب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة حضور الطلاب مع فلترة حسب الطالب والقيد والحالة ونطاق التاريخ.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {attendanceQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {attendanceQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {attendanceQuery.error instanceof Error
                ? attendanceQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!attendanceQuery.isPending && records.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {records.map((record) => (
            <div
              key={record.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {record.studentEnrollment.student.fullName} (
                    {record.studentEnrollment.student.admissionNo ?? "غير متوفر"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    القيد: {formatEnrollmentPlacementLabel(record.studentEnrollment)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {formatDate(record.attendanceDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الدخول: {formatDateTime(record.checkInAt)} | الخروج:{" "}
                    {formatDateTime(record.checkOutAt)}
                  </p>
                  {record.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {record.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">
                    {translateAttendanceStatus(record.status)}
                  </Badge>
                  <Badge variant={record.isActive ? "default" : "outline"}>
                    {record.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(record)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(record)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {record.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(record)}
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
                disabled={!pagination || pagination.page <= 1 || attendanceQuery.isFetching}
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
                  attendanceQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void attendanceQuery.refetch()}
                disabled={attendanceQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${attendanceQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء سجل حضور"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل حضور طالب" : "إنشاء حضور طالب"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء سجل حضور"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>student-attendance.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الطالب</label>
              <StudentPickerSheet
                scope="student-attendance"
                variant="narrow"
                value={selectedFormStudent?.id ?? ""}
                selectedOption={selectedFormStudent}
                onSelect={(option) => {
                  const nextStudentId = option?.id;
                  setSelectedFormStudent(option);
                  setFormState((prev) => ({
                    ...prev,
                    studentEnrollmentId:
                      nextStudentId &&
                      (enrollmentsQuery.data ?? []).some(
                        (item) =>
                          item.id === prev.studentEnrollmentId && item.student.id === nextStudentId,
                      )
                        ? prev.studentEnrollmentId
                        : "",
                  }));
                }}
                disabled={!canReadStudents}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                القيد الطلابي *
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.studentEnrollmentId}
                onChange={(event) => {
                  const nextEnrollmentId = event.target.value;
                  const selectedEnrollment = (enrollmentsQuery.data ?? []).find(
                    (item) => item.id === nextEnrollmentId,
                  );

                  setFormState((prev) => ({
                    ...prev,
                    studentEnrollmentId: nextEnrollmentId,
                  }));

                  if (selectedEnrollment) {
                    setSelectedFormStudent({
                      id: selectedEnrollment.student.id,
                      title: selectedEnrollment.student.fullName,
                      subtitle: selectedEnrollment.student.admissionNo
                        ? `رقم الطالب ${selectedEnrollment.student.admissionNo}`
                        : "بدون رقم طالب",
                      meta: formatEnrollmentPlacementLabel(selectedEnrollment),
                      groupLabel: "الطالب المحدد",
                    });
                  }
                }}
                disabled={!canReadStudentEnrollments}
              >
                <option value="">اختر القيد</option>
                {formEnrollmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayLabel}
                  </option>
                ))}
              </select>
              {selectedFormStudent ? (
                <p className="text-[11px] text-muted-foreground">
                  تم تقليص القيود بحسب الطالب المحدد.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                تاريخ الحضور *
              </label>
              <Input
                type="date"
                value={formState.attendanceDate}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    attendanceDate: event.target.value,
                  }))
                }
                required
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
                    status: event.target.value as StudentAttendanceStatus,
                  }))
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {translateAttendanceStatus(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الدخول</label>
                <Input
                  type="datetime-local"
                  value={formState.checkInAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, checkInAt: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الخروج</label>
                <Input
                  type="datetime-local"
                  value={formState.checkOutAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, checkOutAt: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="مثال: تأخر 5 دقائق"
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

            {!hasDependenciesReadPermissions ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء الصلاحية: <code>student-enrollments.read</code> لاختيار القيد.
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
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء سجل حضور"}
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







"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookText,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateEmployeeCourseMutation,
  useDeleteEmployeeCourseMutation,
  useUpdateEmployeeCourseMutation,
} from "@/features/employee-courses/hooks/use-employee-courses-mutations";
import { useEmployeeCoursesQuery } from "@/features/employee-courses/hooks/use-employee-courses-query";
import { useEmployeeOptionsQuery } from "@/features/employee-courses/hooks/use-employee-options-query";
import type { EmployeeCourseListItem } from "@/lib/api/client";

type CourseFormState = {
  employeeId: string;
  courseName: string;
  courseProvider: string;
  courseDate: string;
  durationDays: string;
  certificateNumber: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: CourseFormState = {
  employeeId: "",
  courseName: "",
  courseProvider: "",
  courseDate: "",
  durationDays: "",
  certificateNumber: "",
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

  return date.toLocaleDateString("ar-YE");
}

function toFormState(course: EmployeeCourseListItem): CourseFormState {
  return {
    employeeId: course.employeeId,
    courseName: course.courseName,
    courseProvider: course.courseProvider ?? "",
    courseDate: toDateInput(course.courseDate),
    durationDays: course.durationDays === null ? "" : String(course.durationDays),
    certificateNumber: course.certificateNumber ?? "",
    notes: course.notes ?? "",
    isActive: course.isActive,
  };
}

export function EmployeeCoursesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-courses.create");
  const canUpdate = hasPermission("employee-courses.update");
  const canDelete = hasPermission("employee-courses.delete");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    employee: string;
    fromDate: string;
    toDate: string;
    active: "all" | "active" | "inactive";
  }>({
    employee: "all",
    fromDate: "",
    toDate: "",
    active: "all",
  });

  const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<CourseFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const coursesQuery = useEmployeeCoursesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    fromDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeCourseMutation();
  const updateMutation = useUpdateEmployeeCourseMutation();
  const deleteMutation = useDeleteEmployeeCourseMutation();

  const courses = React.useMemo(() => coursesQuery.data?.data ?? [], [coursesQuery.data?.data]);
  const pagination = coursesQuery.data?.pagination;
  const isEditing = editingCourseId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
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
      employee: employeeFilter,
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      active: activeFilter,
    });
  }, [activeFilter, employeeFilter, fromDateFilter, isFilterOpen, toDateFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = courses.some((item) => item.id === editingCourseId);
    if (!stillExists) {
      setEditingCourseId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [courses, editingCourseId, isEditing]);

  const resetForm = () => {
    setEditingCourseId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingCourseId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.courseName.trim()) {
      setFormError("اسم الدورة مطلوب.");
      return false;
    }

    if (formState.durationDays.trim()) {
      const duration = Number(formState.durationDays);
      if (!Number.isInteger(duration) || duration < 1 || duration > 365) {
        setFormError("عدد أيام الدورة يجب أن يكون رقمًا صحيحًا بين 1 و 365.");
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
      employeeId: formState.employeeId,
      courseName: formState.courseName.trim(),
      courseProvider: toOptionalString(formState.courseProvider),
      courseDate: formState.courseDate ? toDateIso(formState.courseDate) : undefined,
      durationDays: formState.durationDays.trim() ? Number(formState.durationDays) : undefined,
      certificateNumber: toOptionalString(formState.certificateNumber),
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingCourseId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-courses.update.");
        return;
      }

      updateMutation.mutate(
        {
          courseId: editingCourseId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-courses.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (course: EmployeeCourseListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingCourseId(course.id);
    setFormState(toFormState(course));
    setIsFormOpen(true);
  };

  const handleDelete = (course: EmployeeCourseListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف دورة ${course.courseName} للموظف ${course.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(course.id, {
      onSuccess: () => {
        if (editingCourseId === course.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      employeeFilter !== "all" ? 1 : 0,
      fromDateFilter ? 1 : 0,
      toDateFilter ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, employeeFilter, fromDateFilter, searchInput, toDateFilter]);

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setFromDateFilter(filterDraft.fromDate);
    setToDateFilter(filterDraft.toDate);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالدورة أو الجهة أو الملاحظات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الدورات"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.employee}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, employee: event.target.value }))
              }
            >
              <option value="all">كل الموظفين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </SelectField>

            <Input
              type="date"
              value={filterDraft.fromDate}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, fromDate: event.target.value }))
              }
            />

            <Input
              type="date"
              value={filterDraft.toDate}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, toDate: event.target.value }))
              }
            />

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
              <CardTitle>دورات الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الدورات التدريبية للموظفين مع الفلاتر الزمنية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {coursesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {coursesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {coursesQuery.error instanceof Error
                ? coursesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!coursesQuery.isPending && courses.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {courses.map((course) => (
            <div
              key={course.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="course-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{course.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    الموظف: {course.employee.fullName} ({course.employee.jobNumber ?? "غير متوفر"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الجهة: {course.courseProvider ?? "-"} | التاريخ: {formatDate(course.courseDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المدة: {course.durationDays ?? "-"} | الشهادة:{" "}
                    {course.certificateNumber ?? "-"}
                  </p>
                  {course.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {course.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={course.isActive ? "default" : "outline"}>
                    {course.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(course)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(course)}
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
                disabled={!pagination || pagination.page <= 1 || coursesQuery.isFetching}
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
                  !pagination || pagination.page >= pagination.totalPages || coursesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void coursesQuery.refetch()}
                disabled={coursesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${coursesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء دورة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل دورة موظف" : "إنشاء دورة موظف"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء دورة"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-courses.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="course-form">
            <p className="text-sm text-muted-foreground">
              {isEditing ? "تحديث بيانات الدورة التدريبية." : "إضافة دورة تدريبية جديدة للموظف."}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                disabled={!canReadEmployees}
                data-testid="course-form-employee"
              >
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber ?? "غير متوفر"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">اسم الدورة *</label>
              <Input
                value={formState.courseName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, courseName: event.target.value }))
                }
                placeholder="استراتيجيات التعلم النشط"
                required
                data-testid="course-form-name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">جهة التدريب</label>
              <Input
                value={formState.courseProvider}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    courseProvider: event.target.value,
                  }))
                }
                placeholder="وزارة التربية والتعليم"
                data-testid="course-form-provider"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">تاريخ الدورة</label>
                <Input
                  type="date"
                  value={formState.courseDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, courseDate: event.target.value }))
                  }
                  data-testid="course-form-date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  المدة (بالأيام)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formState.durationDays}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      durationDays: event.target.value,
                    }))
                  }
                  placeholder="5"
                  data-testid="course-form-duration"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">رقم الشهادة</label>
              <Input
                value={formState.certificateNumber}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    certificateNumber: event.target.value,
                  }))
                }
                placeholder="CERT-2026-889"
                data-testid="course-form-certificate"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="مشاركة ممتازة ومشروع نهائي"
                data-testid="course-form-notes"
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
                data-testid="course-form-active"
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

            {!canReadEmployees ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء الصلاحية: <code>employees.read</code> لاختيار الموظف.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing) || !canReadEmployees}
                data-testid="course-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BookText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء دورة"}
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







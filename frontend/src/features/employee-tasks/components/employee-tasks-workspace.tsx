"use client";

import * as React from "react";
import {
  ClipboardList,
  LoaderCircle,
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
import { useAcademicYearOptionsQuery } from "@/features/employee-tasks/hooks/use-academic-year-options-query";
import { useEmployeeOptionsQuery } from "@/features/employee-tasks/hooks/use-employee-options-query";
import {
  useCreateEmployeeTaskMutation,
  useDeleteEmployeeTaskMutation,
  useUpdateEmployeeTaskMutation,
} from "@/features/employee-tasks/hooks/use-employee-tasks-mutations";
import { useEmployeeTasksQuery } from "@/features/employee-tasks/hooks/use-employee-tasks-query";
import type { EmployeeTaskListItem, TimetableDay } from "@/lib/api/client";
import { translateTimetableDay } from "@/lib/i18n/ar";

type EmployeeTaskFormState = {
  employeeId: string;
  academicYearId: string;
  taskName: string;
  dayOfWeek: TimetableDay | "";
  assignmentDate: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DAY_OPTIONS: TimetableDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DEFAULT_FORM_STATE: EmployeeTaskFormState = {
  employeeId: "",
  academicYearId: "",
  taskName: "",
  dayOfWeek: "",
  assignmentDate: "",
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

function toFormState(task: EmployeeTaskListItem): EmployeeTaskFormState {
  return {
    employeeId: task.employeeId,
    academicYearId: task.academicYearId ?? "",
    taskName: task.taskName,
    dayOfWeek: task.dayOfWeek ?? "",
    assignmentDate: toDateInput(task.assignmentDate),
    notes: task.notes ?? "",
    isActive: task.isActive,
  };
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

function formatDay(value: TimetableDay | null): string {
  if (!value) {
    return "-";
  }

  return translateTimetableDay(value);
}

export function EmployeeTasksWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-tasks.create");
  const canUpdate = hasPermission("employee-tasks.update");
  const canDelete = hasPermission("employee-tasks.delete");
  const canReadEmployees = hasPermission("employees.read");
  const canReadAcademicYears = hasPermission("academic-years.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [dayFilter, setDayFilter] = React.useState<TimetableDay | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<EmployeeTaskFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const tasksQuery = useEmployeeTasksQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    dayOfWeek: dayFilter === "all" ? undefined : dayFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();
  const academicYearsQuery = useAcademicYearOptionsQuery();

  const createMutation = useCreateEmployeeTaskMutation();
  const updateMutation = useUpdateEmployeeTaskMutation();
  const deleteMutation = useDeleteEmployeeTaskMutation();

  const tasks = React.useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data?.data]);
  const pagination = tasksQuery.data?.pagination;
  const isEditing = editingTaskId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = tasks.some((item) => item.id === editingTaskId);
    if (!stillExists) {
      setEditingTaskId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [tasks, editingTaskId, isEditing]);

  const resetForm = () => {
    setEditingTaskId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.taskName.trim()) {
      setFormError("اسم المهمة مطلوب.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      employeeId: formState.employeeId,
      academicYearId: formState.academicYearId || undefined,
      taskName: formState.taskName.trim(),
      dayOfWeek: formState.dayOfWeek || undefined,
      assignmentDate: formState.assignmentDate
        ? toDateIso(formState.assignmentDate)
        : undefined,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingTaskId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-tasks.update.");
        return;
      }

      updateMutation.mutate(
        {
          taskId: editingTaskId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-tasks.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (task: EmployeeTaskListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingTaskId(task.id);
    setFormState(toFormState(task));
  };

  const handleDelete = (task: EmployeeTaskListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف مهمة ${task.taskName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        if (editingTaskId === task.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadEmployees && canReadAcademicYears;

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل مهمة موظف" : "إنشاء مهمة موظف"}
          </CardTitle>
          <CardDescription>
            {isEditing ? "تحديث المهمة." : "إضافة مهمة جديدة مرتبطة بموظف."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>employee-tasks.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="task-form">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.employeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                  }
                  disabled={!canReadEmployees}
                  data-testid="task-form-employee"
                >
                  <option value="">اختر الموظف</option>
                  {(employeesQuery.data ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">اسم المهمة *</label>
                <Input
                  value={formState.taskName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, taskName: event.target.value }))
                  }
                  placeholder="إشراف صباحي"
                  required
                  data-testid="task-form-name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  السنة الأكاديمية
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.academicYearId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      academicYearId: event.target.value,
                    }))
                  }
                  disabled={!canReadAcademicYears}
                  data-testid="task-form-year"
                >
                  <option value="">غير مرتبطة</option>
                  {(academicYearsQuery.data ?? []).map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">اليوم</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.dayOfWeek}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        dayOfWeek: event.target.value as TimetableDay | "",
                      }))
                    }
                    data-testid="task-form-day"
                  >
                    <option value="">غير محدد</option>
                    {DAY_OPTIONS.map((day) => (
                      <option key={day} value={day}>
                        {translateTimetableDay(day)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ الإسناد
                  </label>
                  <Input
                    type="date"
                    value={formState.assignmentDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        assignmentDate: event.target.value,
                      }))
                    }
                    data-testid="task-form-date"
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
                  placeholder="مناوبة البوابة قبل الحصة الأولى"
                  data-testid="task-form-notes"
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
                  data-testid="task-form-active"
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
                  يتطلب هذا الجزء صلاحيات القراءة: <code>employees.read</code> و{" "}
                  <code>academic-years.read</code>.
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
                  data-testid="task-form-submit"
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardList className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء مهمة"}
                </Button>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>مهام الموظفين</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة المهام التشغيلية للموظفين مع ربط اختياري بالسنة الأكاديمية.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_170px_160px_130px_auto]"
            data-testid="task-filters-form"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالموظف أو اسم المهمة..."
                className="pr-8"
                data-testid="task-filter-search"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeFilter}
              onChange={(event) => {
                setPage(1);
                setEmployeeFilter(event.target.value);
              }}
              data-testid="task-filter-employee"
            >
              <option value="all">كل الموظفين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={academicYearFilter}
              onChange={(event) => {
                setPage(1);
                setAcademicYearFilter(event.target.value);
              }}
              data-testid="task-filter-year"
            >
              <option value="all">كل السنوات</option>
              {(academicYearsQuery.data ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={dayFilter}
              onChange={(event) => {
                setPage(1);
                setDayFilter(event.target.value as TimetableDay | "all");
              }}
              data-testid="task-filter-day"
            >
              <option value="all">كل الأيام</option>
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {translateTimetableDay(day)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
              data-testid="task-filter-active"
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {tasksQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {tasksQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {tasksQuery.error instanceof Error
                ? tasksQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!tasksQuery.isPending && tasks.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {tasks.map((task) => (
            <div
              key={task.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="task-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{task.taskName}</p>
                  <p className="text-xs text-muted-foreground">
                    الموظف: {task.employee.fullName} ({task.employee.jobNumber ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    السنة:{" "}
                    {task.academicYear
                      ? `${task.academicYear.name} (${task.academicYear.code})`
                      : "غير مرتبطة"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    اليوم: {formatDay(task.dayOfWeek)} | تاريخ الإسناد:{" "}
                    {formatDate(task.assignmentDate)}
                  </p>
                  {task.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {task.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {task.dayOfWeek ? (
                    <Badge variant="secondary">{formatDay(task.dayOfWeek)}</Badge>
                  ) : null}
                  <Badge variant={task.isActive ? "default" : "outline"}>
                    {task.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(task)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(task)}
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
                disabled={!pagination || pagination.page <= 1 || tasksQuery.isFetching}
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
                  tasksQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void tasksQuery.refetch()}
                disabled={tasksQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${tasksQuery.isFetching ? "animate-spin" : ""}`}
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






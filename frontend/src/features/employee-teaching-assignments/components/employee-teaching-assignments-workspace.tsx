"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  UserRoundPlus,
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
  useCreateEmployeeTeachingAssignmentMutation,
  useDeleteEmployeeTeachingAssignmentMutation,
  useUpdateEmployeeTeachingAssignmentMutation,
} from "@/features/employee-teaching-assignments/hooks/use-employee-teaching-assignments-mutations";
import { useEmployeeTeachingAssignmentsQuery } from "@/features/employee-teaching-assignments/hooks/use-employee-teaching-assignments-query";
import { useAcademicYearOptionsQuery } from "@/features/employee-teaching-assignments/hooks/use-academic-year-options-query";
import { useEmployeeOptionsQuery } from "@/features/employee-teaching-assignments/hooks/use-employee-options-query";
import { useSectionOptionsQuery } from "@/features/employee-teaching-assignments/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/employee-teaching-assignments/hooks/use-subject-options-query";
import { useGradeLevelSubjectMappingOptionsQuery } from "@/features/employee-teaching-assignments/hooks/use-grade-level-subject-mapping-options-query";
import type { EmployeeTeachingAssignmentListItem } from "@/lib/api/client";

type AssignmentFormState = {
  employeeId: string;
  sectionId: string;
  subjectId: string;
  academicYearId: string;
  weeklyPeriods: string;
  isPrimary: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: AssignmentFormState = {
  employeeId: "",
  sectionId: "",
  subjectId: "",
  academicYearId: "",
  weeklyPeriods: "1",
  isPrimary: true,
  isActive: true,
};

function toFormState(assignment: EmployeeTeachingAssignmentListItem): AssignmentFormState {
  return {
    employeeId: assignment.employeeId,
    sectionId: assignment.sectionId,
    subjectId: assignment.subjectId,
    academicYearId: assignment.academicYearId,
    weeklyPeriods: String(assignment.weeklyPeriods),
    isPrimary: assignment.isPrimary,
    isActive: assignment.isActive,
  };
}

export function EmployeeTeachingAssignmentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-teaching-assignments.create");
  const canUpdate = hasPermission("employee-teaching-assignments.update");
  const canDelete = hasPermission("employee-teaching-assignments.delete");
  const canReadEmployees = hasPermission("employees.read");
  const canReadSections = hasPermission("sections.read");
  const canReadSubjects = hasPermission("subjects.read");
  const canReadAcademicYears = hasPermission("academic-years.read");
  const canReadGradeLevelSubjects = hasPermission("grade-level-subjects.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingAssignmentId, setEditingAssignmentId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<AssignmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const assignmentsQuery = useEmployeeTeachingAssignmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const academicYearsQuery = useAcademicYearOptionsQuery();

  const selectedSection = React.useMemo(
    () => (sectionsQuery.data ?? []).find((section) => section.id === formState.sectionId),
    [formState.sectionId, sectionsQuery.data],
  );

  const mappingCheckQuery = useGradeLevelSubjectMappingOptionsQuery({
    academicYearId: formState.academicYearId || undefined,
    gradeLevelId: selectedSection?.gradeLevelId,
    subjectId: formState.subjectId || undefined,
    enabled: canReadGradeLevelSubjects,
  });

  const createMutation = useCreateEmployeeTeachingAssignmentMutation();
  const updateMutation = useUpdateEmployeeTeachingAssignmentMutation();
  const deleteMutation = useDeleteEmployeeTeachingAssignmentMutation();

  const assignments = React.useMemo(
    () => assignmentsQuery.data?.data ?? [],
    [assignmentsQuery.data?.data],
  );
  const pagination = assignmentsQuery.data?.pagination;
  const isEditing = editingAssignmentId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = assignments.some((item) => item.id === editingAssignmentId);
    if (!stillExists) {
      setEditingAssignmentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [assignments, editingAssignmentId, isEditing]);

  const resetForm = () => {
    setEditingAssignmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (
      !formState.employeeId ||
      !formState.sectionId ||
      !formState.subjectId ||
      !formState.academicYearId
    ) {
      setFormError("الحقول الأساسية مطلوبة: الموظف، الشعبة، المادة، والسنة الأكاديمية.");
      return false;
    }

    const weeklyPeriods = Number(formState.weeklyPeriods);
    if (!Number.isInteger(weeklyPeriods) || weeklyPeriods < 1 || weeklyPeriods > 60) {
      setFormError("الحصص الأسبوعية يجب أن تكون رقمًا صحيحًا بين 1 و60.");
      return false;
    }

    if (canReadGradeLevelSubjects && selectedSection) {
      if (mappingCheckQuery.isFetching) {
        setFormError("جاري التحقق من ربط الصف بالمادة في السنة المحددة...");
        return false;
      }

      if ((mappingCheckQuery.data ?? []).length === 0) {
        setFormError(
          "لا يوجد ربط نشط بين الصف والمادة في هذه السنة الأكاديمية. أنشئ ربط الصف مع المادة أولًا.",
        );
        return false;
      }
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
      sectionId: formState.sectionId,
      subjectId: formState.subjectId,
      academicYearId: formState.academicYearId,
      weeklyPeriods: Number(formState.weeklyPeriods),
      isPrimary: formState.isPrimary,
      isActive: formState.isActive,
    };

    if (isEditing && editingAssignmentId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية employee-teaching-assignments.update.");
        return;
      }

      updateMutation.mutate(
        {
          assignmentId: editingAssignmentId,
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
      setFormError("لا تملك صلاحية employee-teaching-assignments.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (assignment: EmployeeTeachingAssignmentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingAssignmentId(assignment.id);
    setFormState(toFormState(assignment));
  };

  const handleDelete = (assignment: EmployeeTeachingAssignmentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف إسناد ${assignment.subject.name} للشعبة ${assignment.section.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(assignment.id, {
      onSuccess: () => {
        if (editingAssignmentId === assignment.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadEmployees && canReadSections && canReadSubjects && canReadAcademicYears;

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل إسناد تدريس" : "إنشاء إسناد تدريس"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث ربط المعلم بالشعبة والمادة والسنة الأكاديمية."
              : "إضافة إسناد تدريس جديد ضمن الموارد البشرية."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>employee-teaching-assignments.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.employeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                  }
                  disabled={!canReadEmployees}
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
                <label className="text-xs font-medium text-muted-foreground">الشعبة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.sectionId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sectionId: event.target.value }))
                  }
                  disabled={!canReadSections}
                >
                  <option value="">اختر الشعبة</option>
                  {(sectionsQuery.data ?? []).map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">المادة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.subjectId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, subjectId: event.target.value }))
                  }
                  disabled={!canReadSubjects}
                >
                  <option value="">اختر المادة</option>
                  {(subjectsQuery.data ?? []).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
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
                <label className="text-xs font-medium text-muted-foreground">
                  الحصص الأسبوعية *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={formState.weeklyPeriods}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, weeklyPeriods: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>مدرس أساسي</span>
                  <input
                    type="checkbox"
                    checked={formState.isPrimary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isPrimary: event.target.checked }))
                    }
                  />
                </label>
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
              </div>

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
                  يلزم صلاحيات القراءة: <code>employees.read</code>, <code>sections.read</code>,{" "}
                  <code>subjects.read</code>, <code>academic-years.read</code>.
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
                    <UserRoundPlus className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء إسناد تدريس"}
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
            <CardTitle>قائمة إسناد التدريس</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة إسناد المواد للمعلمين حسب الشعبة والسنة الأكاديمية.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_180px_170px_170px_170px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالمعلم أو الشعبة أو المادة..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeFilter}
              onChange={(event) => {
                setPage(1);
                setEmployeeFilter(event.target.value);
              }}
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
              value={sectionFilter}
              onChange={(event) => {
                setPage(1);
                setSectionFilter(event.target.value);
              }}
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code}
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
              {(subjectsQuery.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code}
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
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
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
          {assignmentsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {assignmentsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {assignmentsQuery.error instanceof Error
                ? assignmentsQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}

          {!assignmentsQuery.isPending && assignments.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {assignment.employee.fullName} - {assignment.subject.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الشعبة: {assignment.section.name} ({assignment.section.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    السنة: {assignment.academicYear.name} ({assignment.academicYear.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الحصص الأسبوعية: {assignment.weeklyPeriods}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={assignment.isPrimary ? "default" : "secondary"}>
                    {assignment.isPrimary ? "أساسي" : "مساند"}
                  </Badge>
                  <Badge variant={assignment.isActive ? "default" : "outline"}>
                    {assignment.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(assignment)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(assignment)}
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
                disabled={!pagination || pagination.page <= 1 || assignmentsQuery.isFetching}
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
                  assignmentsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void assignmentsQuery.refetch()}
                disabled={assignmentsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`}
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






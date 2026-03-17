"use client";

import * as React from "react";
import Link from "next/link";
import {
  Cable,
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
import {
  useCreateEmployeeSectionSupervisionMutation,
  useDeleteEmployeeSectionSupervisionMutation,
  useUpdateEmployeeSectionSupervisionMutation,
} from "@/features/teaching-assignments/employee-section-supervisions/hooks/use-employee-section-supervisions-mutations";
import { useEmployeeSectionSupervisionsQuery } from "@/features/teaching-assignments/employee-section-supervisions/hooks/use-employee-section-supervisions-query";
import { useAcademicYearOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-academic-year-options-query";
import { useEmployeeOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-employee-options-query";
import { useSectionOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-section-options-query";
import type { EmployeeSectionSupervisionListItem } from "@/lib/api/client";

type FormState = {
  employeeId: string;
  sectionId: string;
  academicYearId: string;
  canViewStudents: boolean;
  canManageHomeworks: boolean;
  canManageGrades: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM_STATE: FormState = {
  employeeId: "",
  sectionId: "",
  academicYearId: "",
  canViewStudents: true,
  canManageHomeworks: true,
  canManageGrades: true,
  isActive: true,
};

function toFormState(item: EmployeeSectionSupervisionListItem): FormState {
  return {
    employeeId: item.employeeId,
    sectionId: item.sectionId,
    academicYearId: item.academicYearId,
    canViewStudents: item.canViewStudents,
    canManageHomeworks: item.canManageHomeworks,
    canManageGrades: item.canManageGrades,
    isActive: item.isActive,
  };
}

export function EmployeeSectionSupervisionsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-section-supervisions.create");
  const canUpdate = hasPermission("employee-section-supervisions.update");
  const canDelete = hasPermission("employee-section-supervisions.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");

  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [formState, setFormState] =
    React.useState<FormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const employeesOptionsQuery = useEmployeeOptionsQuery();
  const sectionsOptionsQuery = useSectionOptionsQuery();
  const academicYearsOptionsQuery = useAcademicYearOptionsQuery();

  const query = useEmployeeSectionSupervisionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    academicYearId:
      academicYearFilter === "all" ? undefined : academicYearFilter,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const createMutation = useCreateEmployeeSectionSupervisionMutation();
  const updateMutation = useUpdateEmployeeSectionSupervisionMutation();
  const deleteMutation = useDeleteEmployeeSectionSupervisionMutation();

  const employees = React.useMemo(
    () => employeesOptionsQuery.data ?? [],
    [employeesOptionsQuery.data],
  );
  const selectedEmployee = React.useMemo(
    () => employees.find((employee) => employee.id === formState.employeeId),
    [employees, formState.employeeId],
  );
  const sections = React.useMemo(
    () => sectionsOptionsQuery.data ?? [],
    [sectionsOptionsQuery.data],
  );
  const academicYears = React.useMemo(
    () => academicYearsOptionsQuery.data ?? [],
    [academicYearsOptionsQuery.data],
  );
  const items = React.useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const pagination = query.data?.pagination;
  const isEditing = editingItemId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = items.some((item) => item.id === editingItemId);
    if (!stillExists) {
      setEditingItemId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingItemId, isEditing, items]);

  const resetForm = () => {
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStartEdit = (item: EmployeeSectionSupervisionListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingItemId(item.id);
    setFormState(toFormState(item));
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (
      !formState.employeeId ||
      !formState.sectionId ||
      !formState.academicYearId
    ) {
      setFormError("اختر الموظف والشعبة والسنة الأكاديمية.");
      return false;
    }

    if (
      !formState.canViewStudents &&
      !formState.canManageHomeworks &&
      !formState.canManageGrades
    ) {
      setFormError("فعّل قدرة واحدة على الأقل.");
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
      sectionId: formState.sectionId,
      academicYearId: formState.academicYearId,
      canViewStudents: formState.canViewStudents,
      canManageHomeworks: formState.canManageHomeworks,
      canManageGrades: formState.canManageGrades,
      isActive: formState.isActive,
    };

    if (isEditing && editingItemId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-section-supervisions.update.");
        return;
      }

      updateMutation.mutate(
        {
          supervisionId: editingItemId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-section-supervisions.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleDelete = (item: EmployeeSectionSupervisionListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm("تأكيد حذف نطاق الإشراف؟");
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingItemId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل نطاق إشراف" : "إضافة نطاق إشراف"}
          </CardTitle>
          <CardDescription>
            يحدد هذا الربط ما يمكن للموظف عمله داخل شعبة محددة في سنة أكاديمية
            محددة. لا يستبدل ربط المستخدم بالأدوار.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>employee-section-supervisions.create</code>.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={handleSubmitForm}
              data-testid="employee-section-supervision-form"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الموظف *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.employeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      employeeId: event.target.value,
                    }))
                  }
                  data-testid="employee-section-supervision-form-employee"
                >
                  <option value="">اختر موظفًا</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.jobNumber})
                    </option>
                  ))}
                </select>
                {selectedEmployee && !selectedEmployee.userAccount ? (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                    الموظف المختار لا يملك حساب مستخدم مرتبط. نطاق الإشراف
                    سيُحفظ، لكن التطبيق يحتاج حسابًا مرتبطًا لتفعيل الوصول داخل
                    النظام من{" "}
                    <Link
                      href={`/app/users?q=${encodeURIComponent(selectedEmployee.fullName)}`}
                      className="underline underline-offset-2"
                    >
                      إدارة المستخدمين
                    </Link>
                    .
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الشعبة *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.sectionId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      sectionId: event.target.value,
                    }))
                  }
                  data-testid="employee-section-supervision-form-section"
                >
                  <option value="">اختر شعبة</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.code})
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
                    setFormState((prev) => ({
                      ...prev,
                      academicYearId: event.target.value,
                    }))
                  }
                  data-testid="employee-section-supervision-form-academic-year"
                >
                  <option value="">اختر سنة أكاديمية</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  القدرات
                </p>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>عرض الطلاب</span>
                  <input
                    type="checkbox"
                    checked={formState.canViewStudents}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        canViewStudents: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>إدارة الواجبات</span>
                  <input
                    type="checkbox"
                    checked={formState.canManageHomeworks}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        canManageHomeworks: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>إدارة الدرجات</span>
                  <input
                    type="checkbox"
                    checked={formState.canManageGrades}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        canManageGrades: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
                  <span>نشط</span>
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
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

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isFormSubmitting || (!canCreate && !isEditing)}
                  data-testid="employee-section-supervision-form-submit"
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cable className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "حفظ نطاق الإشراف"}
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
            <CardTitle>نطاقات إشراف الموظفين</CardTitle>
            <Badge variant="secondary">
              الإجمالي: {pagination?.total ?? 0}
            </Badge>
          </div>
          <CardDescription>
            يستخدم النظام هذه السجلات لتحديد من يمكنه الوصول للطلاب والواجبات
            والدرجات خارج الإسناد المباشر. التحكم النهائي = صلاحيات الدور + هذا
            النطاق.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_220px_220px_220px_140px_auto]"
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
              value={employeeFilter}
              onChange={(event) => {
                setPage(1);
                setEmployeeFilter(event.target.value);
              }}
            >
              <option value="all">كل الموظفين</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
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
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
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
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(
                  event.target.value as "all" | "active" | "inactive",
                );
              }}
            >
              <option value="all">كل الحالات</option>
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
          {query.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {query.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {query.error instanceof Error
                ? query.error.message
                : "فشل تحميل البيانات"}
            </div>
          ) : null}

          {!query.isPending && items.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {items.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="employee-section-supervision-card"
            >
              <div className="space-y-1">
                <p className="font-medium">
                  {item.employee.fullName} - {item.employee.jobTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.section.name} ({item.section.code}) |{" "}
                  {item.academicYear.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                  <Badge
                    variant={item.canViewStudents ? "secondary" : "outline"}
                  >
                    {item.canViewStudents
                      ? "عرض الطلاب: نعم"
                      : "عرض الطلاب: لا"}
                  </Badge>
                  <Badge
                    variant={item.canManageHomeworks ? "secondary" : "outline"}
                  >
                    {item.canManageHomeworks
                      ? "إدارة الواجبات: نعم"
                      : "إدارة الواجبات: لا"}
                  </Badge>
                  <Badge
                    variant={item.canManageGrades ? "secondary" : "outline"}
                  >
                    {item.canManageGrades
                      ? "إدارة الدرجات: نعم"
                      : "إدارة الدرجات: لا"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(item)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(item)}
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
              صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={
                  !pagination || pagination.page <= 1 || query.isFetching
                }
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    pagination
                      ? Math.min(prev + 1, pagination.totalPages)
                      : prev,
                  )
                }
                disabled={
                  !pagination ||
                  pagination.page >= pagination.totalPages ||
                  query.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
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

"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  Users,
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
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useUpdateEmployeeMutation,
} from "@/features/employees/hooks/use-employees-mutations";
import { useIdTypeOptionsQuery } from "@/features/employees/hooks/use-id-type-options-query";
import { useEmployeesQuery } from "@/features/employees/hooks/use-employees-query";
import {
  translateEmployeeGender,
  translateEmployeeSystemAccessStatus,
  translateEmploymentType,
} from "@/lib/i18n/ar";
import type {
  EmployeeGender,
  EmployeeListItem,
  EmployeeSystemAccessStatus,
  EmploymentType,
} from "@/lib/api/client";

type EmployeeFormState = {
  jobNumber: string;
  financialNumber: string;
  fullName: string;
  gender: EmployeeGender;
  birthDate: string;
  phonePrimary: string;
  phoneSecondary: string;
  hasWhatsapp: boolean;
  qualification: string;
  qualificationDate: string;
  specialization: string;
  idNumber: string;
  idTypeId: string;
  idExpiryDate: string;
  experienceYears: string;
  employmentType: EmploymentType | "";
  jobTitle: string;
  hireDate: string;
  previousSchool: string;
  salaryApproved: boolean;
  systemAccessStatus: EmployeeSystemAccessStatus;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: EmployeeFormState = {
  jobNumber: "",
  financialNumber: "",
  fullName: "",
  gender: "MALE",
  birthDate: "",
  phonePrimary: "",
  phoneSecondary: "",
  hasWhatsapp: true,
  qualification: "",
  qualificationDate: "",
  specialization: "",
  idNumber: "",
  idTypeId: "",
  idExpiryDate: "",
  experienceYears: "0",
  employmentType: "",
  jobTitle: "",
  hireDate: "",
  previousSchool: "",
  salaryApproved: false,
  systemAccessStatus: "GRANTED",
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

function toFormState(employee: EmployeeListItem): EmployeeFormState {
  return {
    jobNumber: employee.jobNumber ?? "",
    financialNumber: employee.financialNumber ?? "",
    fullName: employee.fullName,
    gender: employee.gender,
    birthDate: toDateInput(employee.birthDate),
    phonePrimary: employee.phonePrimary ?? "",
    phoneSecondary: employee.phoneSecondary ?? "",
    hasWhatsapp: employee.hasWhatsapp,
    qualification: employee.qualification ?? "",
    qualificationDate: toDateInput(employee.qualificationDate),
    specialization: employee.specialization ?? "",
    idNumber: employee.idNumber ?? "",
    idTypeId: employee.idTypeId ? String(employee.idTypeId) : "",
    idExpiryDate: toDateInput(employee.idExpiryDate),
    experienceYears: String(employee.experienceYears),
    employmentType: employee.employmentType ?? "",
    jobTitle: employee.jobTitle ?? "",
    hireDate: toDateInput(employee.hireDate),
    previousSchool: employee.previousSchool ?? "",
    salaryApproved: employee.salaryApproved,
    systemAccessStatus: employee.systemAccessStatus,
    isActive: employee.isActive,
  };
}

export function EmployeesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employees.create");
  const canUpdate = hasPermission("employees.update");
  const canDelete = hasPermission("employees.delete");
  const canReadIdTypes = hasPermission("lookup-id-types.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<EmployeeGender | "all">("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = React.useState<
    EmploymentType | "all"
  >("all");
  const [idTypeFilter, setIdTypeFilter] = React.useState<string>("all");
  const [jobTitleInput, setJobTitleInput] = React.useState("");
  const [jobTitleFilter, setJobTitleFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<EmployeeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const employeesQuery = useEmployeesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    gender: genderFilter === "all" ? undefined : genderFilter,
    employmentType: employmentTypeFilter === "all" ? undefined : employmentTypeFilter,
    idTypeId: idTypeFilter === "all" ? undefined : Number(idTypeFilter),
    jobTitle: jobTitleFilter || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const idTypeOptionsQuery = useIdTypeOptionsQuery();

  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();

  const employees = React.useMemo(
    () => employeesQuery.data?.data ?? [],
    [employeesQuery.data?.data],
  );
  const idTypeOptions = idTypeOptionsQuery.data ?? [];
  const pagination = employeesQuery.data?.pagination;
  const isEditing = editingEmployeeId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = employees.some((employee) => employee.id === editingEmployeeId);
    if (!stillExists) {
      setEditingEmployeeId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingEmployeeId, employees, isEditing]);

  const resetForm = () => {
    setEditingEmployeeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setJobTitleFilter(jobTitleInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.fullName.trim()) {
      setFormError("الاسم الكامل مطلوب.");
      return false;
    }

    const experienceYears = Number(formState.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80) {
      setFormError("experienceYears يجب أن يكون رقمًا صحيحًا بين 0 و 80.");
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
      jobNumber: toOptionalString(formState.jobNumber),
      financialNumber: toOptionalString(formState.financialNumber),
      fullName: formState.fullName.trim(),
      gender: formState.gender,
      birthDate: formState.birthDate ? toDateIso(formState.birthDate) : undefined,
      phonePrimary: toOptionalString(formState.phonePrimary),
      phoneSecondary: toOptionalString(formState.phoneSecondary),
      hasWhatsapp: formState.hasWhatsapp,
      qualification: toOptionalString(formState.qualification),
      qualificationDate: formState.qualificationDate
        ? toDateIso(formState.qualificationDate)
        : undefined,
      specialization: toOptionalString(formState.specialization),
      idNumber: toOptionalString(formState.idNumber),
      idTypeId: formState.idTypeId ? Number(formState.idTypeId) : null,
      idExpiryDate: formState.idExpiryDate ? toDateIso(formState.idExpiryDate) : undefined,
      experienceYears: Number(formState.experienceYears),
      employmentType: formState.employmentType || undefined,
      jobTitle: toOptionalString(formState.jobTitle),
      hireDate: formState.hireDate ? toDateIso(formState.hireDate) : undefined,
      previousSchool: toOptionalString(formState.previousSchool),
      salaryApproved: formState.salaryApproved,
      systemAccessStatus: formState.systemAccessStatus,
      isActive: formState.isActive,
    };

    if (isEditing && editingEmployeeId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية employees.update.");
        return;
      }

      updateMutation.mutate(
        {
          employeeId: editingEmployeeId,
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
      setFormError("لا تملك صلاحية employees.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (employee: EmployeeListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingEmployeeId(employee.id);
    setFormState(toFormState(employee));
  };

  const handleToggleActive = (employee: EmployeeListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      employeeId: employee.id,
      payload: {
        isActive: !employee.isActive,
      },
    });
  };

  const handleDelete = (employee: EmployeeListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الموظف ${employee.fullName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(employee.id, {
      onSuccess: () => {
        if (editingEmployeeId === employee.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل موظف" : "إنشاء موظف"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل البيانات الأساسية والإدارية للموظف."
              : "إضافة ملف موظف جديد ضمن نظام الموارد البشرية."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>employees.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الرقم الوظيفي
                  </label>
                  <Input
                    value={formState.jobNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, jobNumber: event.target.value }))
                    }
                    placeholder="وظ-0012"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الرقم المالي
                  </label>
                  <Input
                    value={formState.financialNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        financialNumber: event.target.value,
                      }))
                    }
                    placeholder="مالي-88991"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم الكامل *</label>
                <Input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="أحمد علي حسن"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">الجنس *</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.gender}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        gender: event.target.value as EmployeeGender,
                      }))
                    }
                  >
                    <option value="MALE">{translateEmployeeGender("MALE")}</option>
                    <option value="FEMALE">{translateEmployeeGender("FEMALE")}</option>
                    <option value="OTHER">{translateEmployeeGender("OTHER")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ الميلاد</label>
                  <Input
                    type="date"
                    value={formState.birthDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, birthDate: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الهاتف الأساسي
                  </label>
                  <Input
                    value={formState.phonePrimary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, phonePrimary: event.target.value }))
                    }
                    placeholder="+967777111222"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الهاتف الاحتياطي
                  </label>
                  <Input
                    value={formState.phoneSecondary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, phoneSecondary: event.target.value }))
                    }
                    placeholder="+967733444555"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    المؤهل العلمي
                  </label>
                  <Input
                    value={formState.qualification}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, qualification: event.target.value }))
                    }
                    placeholder="بكالوريوس تربية"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ المؤهل
                  </label>
                  <Input
                    type="date"
                    value={formState.qualificationDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        qualificationDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">التخصص</label>
                  <Input
                    value={formState.specialization}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, specialization: event.target.value }))
                    }
                    placeholder="رياضيات"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    سنوات الخبرة
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    value={formState.experienceYears}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, experienceYears: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">رقم الهوية</label>
                  <Input
                    value={formState.idNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idNumber: event.target.value }))
                    }
                    placeholder="A123456789"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نوع الهوية</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.idTypeId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        idTypeId: event.target.value,
                      }))
                    }
                    disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
                  >
                    <option value="">غير محدد</option>
                    {idTypeOptions.map((idType) => (
                      <option key={idType.id} value={idType.id}>
                        {idType.nameAr} ({idType.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ انتهاء الهوية
                  </label>
                  <Input
                    type="date"
                    value={formState.idExpiryDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idExpiryDate: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    نوع التوظيف
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.employmentType}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        employmentType: event.target.value as EmploymentType | "",
                      }))
                    }
                  >
                    <option value="">غير محدد</option>
                    <option value="PERMANENT">{translateEmploymentType("PERMANENT")}</option>
                    <option value="CONTRACT">{translateEmploymentType("CONTRACT")}</option>
                    <option value="VOLUNTEER">{translateEmploymentType("VOLUNTEER")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">المسمى الوظيفي</label>
                  <Input
                    value={formState.jobTitle}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, jobTitle: event.target.value }))
                    }
                    placeholder="معلم لغة عربية أول"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ التعيين</label>
                  <Input
                    type="date"
                    value={formState.hireDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, hireDate: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    المدرسة السابقة
                  </label>
                  <Input
                    value={formState.previousSchool}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        previousSchool: event.target.value,
                      }))
                    }
                    placeholder="مدرسة النور الأهلية"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  حالة صلاحية النظام
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.systemAccessStatus}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      systemAccessStatus: event.target.value as EmployeeSystemAccessStatus,
                      }))
                    }
                  >
                  <option value="GRANTED">
                    {translateEmployeeSystemAccessStatus("GRANTED")}
                  </option>
                  <option value="SUSPENDED">
                    {translateEmployeeSystemAccessStatus("SUSPENDED")}
                  </option>
                </select>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>لديه واتساب</span>
                  <input
                    type="checkbox"
                    checked={formState.hasWhatsapp}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        hasWhatsapp: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>الراتب معتمد</span>
                  <input
                    type="checkbox"
                    checked={formState.salaryApproved}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        salaryApproved: event.target.checked,
                      }))
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

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isFormSubmitting || (!canCreate && !isEditing)}
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء موظف"}
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
            <CardTitle>قائمة الموظفين</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة الموظفين مع فلترة بالبحث والجنس ونوع التوظيف والمسمى الوظيفي.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_150px_170px_170px_1fr_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم أو الرقم الوظيفي..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={genderFilter}
              onChange={(event) => {
                setPage(1);
                setGenderFilter(event.target.value as EmployeeGender | "all");
              }}
            >
              <option value="all">كل الأجناس</option>
              <option value="MALE">{translateEmployeeGender("MALE")}</option>
              <option value="FEMALE">{translateEmployeeGender("FEMALE")}</option>
              <option value="OTHER">{translateEmployeeGender("OTHER")}</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={employmentTypeFilter}
              onChange={(event) => {
                setPage(1);
                setEmploymentTypeFilter(event.target.value as EmploymentType | "all");
              }}
            >
              <option value="all">كل الأنواع</option>
              <option value="PERMANENT">{translateEmploymentType("PERMANENT")}</option>
              <option value="CONTRACT">{translateEmploymentType("CONTRACT")}</option>
              <option value="VOLUNTEER">{translateEmploymentType("VOLUNTEER")}</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={idTypeFilter}
              onChange={(event) => {
                setPage(1);
                setIdTypeFilter(event.target.value);
              }}
              disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
            >
              <option value="all">كل أنواع الهوية</option>
              {idTypeOptions.map((idType) => (
                <option key={idType.id} value={idType.id}>
                  {idType.nameAr}
                </option>
              ))}
            </select>

            <Input
              value={jobTitleInput}
              onChange={(event) => setJobTitleInput(event.target.value)}
              placeholder="فلترة بالمسمى الوظيفي..."
            />

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">غير نشط فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {employeesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل قائمة الموظفين...
            </div>
          ) : null}

          {employeesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {employeesQuery.error instanceof Error
                ? employeesQuery.error.message
                : "فشل تحميل قائمة الموظفين"}
            </div>
          ) : null}

          {!employeesQuery.isPending && employees.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          ) : null}

          {employees.map((employee) => (
            <div
              key={employee.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{employee.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    المسمى: {employee.jobTitle ?? "-"} | الرقم الوظيفي: {employee.jobNumber ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الرقم المالي: {employee.financialNumber ?? "-"} | الخبرة: {employee.experienceYears}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الهوية: {employee.idNumber ?? "-"} | النوع: {employee.idType?.nameAr ?? "غير محدد"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{translateEmployeeGender(employee.gender)}</Badge>
                  <Badge variant="secondary">
                    {employee.employmentType
                      ? translateEmploymentType(employee.employmentType)
                      : "غير محدد"}
                  </Badge>
                  <Badge variant={employee.systemAccessStatus === "GRANTED" ? "default" : "outline"}>
                    {translateEmployeeSystemAccessStatus(employee.systemAccessStatus)}
                  </Badge>
                  <Badge variant={employee.isActive ? "default" : "outline"}>
                    {employee.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(employee)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(employee)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {employee.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(employee)}
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
                disabled={!pagination || pagination.page <= 1 || employeesQuery.isFetching}
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
                  employeesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void employeesQuery.refetch()}
                disabled={employeesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${employeesQuery.isFetching ? "animate-spin" : ""}`}
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






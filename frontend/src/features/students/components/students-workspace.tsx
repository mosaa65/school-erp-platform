"use client";

import * as React from "react";
import { LoaderCircle, PencilLine, RefreshCw, Search, Trash2, Users } from "lucide-react";
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
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useUpdateStudentMutation,
} from "@/features/students/hooks/use-students-mutations";
import { useBloodTypeOptionsQuery } from "@/features/students/hooks/use-blood-type-options-query";
import { useStudentsQuery } from "@/features/students/hooks/use-students-query";
import {
  translateStudentEnrollmentStatus,
  translateStudentGender,
  translateStudentHealthStatus,
  translateStudentOrphanStatus,
} from "@/lib/i18n/ar";
import type {
  StudentGender,
  StudentHealthStatus,
  StudentListItem,
  StudentOrphanStatus,
} from "@/lib/api/client";

type StudentFormState = {
  admissionNo: string;
  fullName: string;
  gender: StudentGender;
  birthDate: string;
  bloodTypeId: string;
  healthStatus: StudentHealthStatus | "";
  healthNotes: string;
  orphanStatus: StudentOrphanStatus;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const GENDER_OPTIONS: StudentGender[] = ["MALE", "FEMALE", "OTHER"];
const HEALTH_OPTIONS: StudentHealthStatus[] = [
  "HEALTHY",
  "CHRONIC_DISEASE",
  "SPECIAL_NEEDS",
  "DISABILITY",
  "OTHER",
];
const ORPHAN_OPTIONS: StudentOrphanStatus[] = [
  "NONE",
  "FATHER_DECEASED",
  "MOTHER_DECEASED",
  "BOTH_DECEASED",
];

const DEFAULT_FORM_STATE: StudentFormState = {
  admissionNo: "",
  fullName: "",
  gender: "MALE",
  birthDate: "",
  bloodTypeId: "",
  healthStatus: "",
  healthNotes: "",
  orphanStatus: "NONE",
  isActive: true,
};

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

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) {
    return "-";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function toFormState(student: StudentListItem): StudentFormState {
  return {
    admissionNo: student.admissionNo ?? "",
    fullName: student.fullName,
    gender: student.gender,
    birthDate: toDateInput(student.birthDate),
    bloodTypeId: student.bloodTypeId ? String(student.bloodTypeId) : "",
    healthStatus: student.healthStatus ?? "",
    healthNotes: student.healthNotes ?? "",
    orphanStatus: student.orphanStatus,
    isActive: student.isActive,
  };
}

function orphanBadgeVariant(
  orphanStatus: StudentOrphanStatus,
): "default" | "secondary" | "outline" {
  if (orphanStatus === "NONE") {
    return "outline";
  }

  if (orphanStatus === "BOTH_DECEASED") {
    return "default";
  }

  return "secondary";
}

function healthBadgeVariant(
  healthStatus: StudentHealthStatus | null,
): "default" | "secondary" | "outline" {
  if (!healthStatus) {
    return "outline";
  }

  if (healthStatus === "HEALTHY") {
    return "secondary";
  }

  return "default";
}

export function StudentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("students.create");
  const canUpdate = hasPermission("students.update");
  const canDelete = hasPermission("students.delete");
  const canReadBloodTypes = hasPermission("lookup-blood-types.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<StudentGender | "all">("all");
  const [bloodTypeFilter, setBloodTypeFilter] = React.useState<string>("all");
  const [orphanFilter, setOrphanFilter] = React.useState<StudentOrphanStatus | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingStudentId, setEditingStudentId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<StudentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const studentsQuery = useStudentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    gender: genderFilter === "all" ? undefined : genderFilter,
    bloodTypeId: bloodTypeFilter === "all" ? undefined : Number(bloodTypeFilter),
    orphanStatus: orphanFilter === "all" ? undefined : orphanFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const bloodTypeOptionsQuery = useBloodTypeOptionsQuery();

  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();
  const deleteMutation = useDeleteStudentMutation();

  const students = React.useMemo(() => studentsQuery.data?.data ?? [], [studentsQuery.data?.data]);
  const bloodTypeOptions = bloodTypeOptionsQuery.data ?? [];
  const pagination = studentsQuery.data?.pagination;
  const isEditing = editingStudentId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = students.some((student) => student.id === editingStudentId);
    if (!stillExists) {
      setEditingStudentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingStudentId, isEditing, students]);

  const resetForm = () => {
    setEditingStudentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.fullName.trim()) {
      setFormError("الاسم الكامل مطلوب.");
      return false;
    }

    if (formState.admissionNo.trim().length > 40) {
      setFormError("admissionNo يجب ألا يتجاوز 40 حرف.");
      return false;
    }

    if (formState.fullName.trim().length > 150) {
      setFormError("fullName يجب ألا يتجاوز 150 حرف.");
      return false;
    }

    if (formState.healthNotes.trim().length > 1000) {
      setFormError("healthNotes يجب ألا يتجاوز 1000 حرف.");
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
      admissionNo: toOptionalString(formState.admissionNo),
      fullName: formState.fullName.trim(),
      gender: formState.gender,
      birthDate: formState.birthDate ? toDateIso(formState.birthDate) : undefined,
      bloodTypeId: formState.bloodTypeId ? Number(formState.bloodTypeId) : null,
      healthStatus: formState.healthStatus || undefined,
      healthNotes: toOptionalString(formState.healthNotes),
      orphanStatus: formState.orphanStatus,
      isActive: formState.isActive,
    };

    if (isEditing && editingStudentId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية students.update.");
        return;
      }

      updateMutation.mutate(
        {
          studentId: editingStudentId,
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
      setFormError("لا تملك صلاحية students.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (student: StudentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingStudentId(student.id);
    setFormState(toFormState(student));
  };

  const handleToggleActive = (student: StudentListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      studentId: student.id,
      payload: {
        isActive: !student.isActive,
      },
    });
  };

  const handleDelete = (student: StudentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الطالب ${student.fullName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(student.id, {
      onSuccess: () => {
        if (editingStudentId === student.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل طالب" : "إنشاء طالب"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث بيانات الطالب الأساسية."
              : "إضافة طالب جديد ضمن نظام إدارة الطلاب."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>students.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">رقم القيد</label>
                <Input
                  value={formState.admissionNo}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, admissionNo: event.target.value }))
                  }
                  placeholder="ق-2026-00123"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم الكامل *</label>
                <Input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="محمد أحمد علي"
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
                        gender: event.target.value as StudentGender,
                      }))
                    }
                  >
                    {GENDER_OPTIONS.map((gender) => (
                      <option key={gender} value={gender}>
                        {translateStudentGender(gender)}
                      </option>
                    ))}
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

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">فصيلة الدم</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.bloodTypeId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        bloodTypeId: event.target.value,
                      }))
                    }
                    disabled={!canReadBloodTypes || bloodTypeOptionsQuery.isLoading}
                  >
                    <option value="">غير محدد</option>
                    {bloodTypeOptions.map((bloodType) => (
                      <option key={bloodType.id} value={bloodType.id}>
                        {bloodType.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">الحالة الصحية</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.healthStatus}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        healthStatus: event.target.value as StudentHealthStatus | "",
                      }))
                    }
                  >
                    <option value="">غير محدد</option>
                    {HEALTH_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {translateStudentHealthStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">حالة اليتم *</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.orphanStatus}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        orphanStatus: event.target.value as StudentOrphanStatus,
                      }))
                    }
                  >
                    {ORPHAN_OPTIONS.map((orphanStatus) => (
                      <option key={orphanStatus} value={orphanStatus}>
                        {translateStudentOrphanStatus(orphanStatus)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ملاحظات صحية</label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.healthNotes}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, healthNotes: event.target.value }))
                  }
                  placeholder="ملاحظات صحية إضافية (اختياري)"
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
                  {isEditing ? "حفظ التعديلات" : "إنشاء طالب"}
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
            <CardTitle>قائمة الطلاب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة الطلاب مع الفلترة حسب النوع الاجتماعي وحالة اليتم.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_150px_170px_190px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم أو رقم القيد..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={genderFilter}
              onChange={(event) => {
                setPage(1);
                setGenderFilter(event.target.value as StudentGender | "all");
              }}
            >
              <option value="all">كل الأجناس</option>
              {GENDER_OPTIONS.map((gender) => (
                <option key={gender} value={gender}>
                  {translateStudentGender(gender)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={bloodTypeFilter}
              onChange={(event) => {
                setPage(1);
                setBloodTypeFilter(event.target.value);
              }}
              disabled={!canReadBloodTypes || bloodTypeOptionsQuery.isLoading}
            >
              <option value="all">كل الفصائل</option>
              {bloodTypeOptions.map((bloodType) => (
                <option key={bloodType.id} value={bloodType.id}>
                  {bloodType.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={orphanFilter}
              onChange={(event) => {
                setPage(1);
                setOrphanFilter(event.target.value as StudentOrphanStatus | "all");
              }}
            >
              <option value="all">كل حالات اليتم</option>
              {ORPHAN_OPTIONS.map((orphanStatus) => (
                <option key={orphanStatus} value={orphanStatus}>
                  {translateStudentOrphanStatus(orphanStatus)}
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
          {studentsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل قائمة الطلاب...
            </div>
          ) : null}

          {studentsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {studentsQuery.error instanceof Error
                ? studentsQuery.error.message
                : "فشل تحميل قائمة الطلاب"}
            </div>
          ) : null}

          {!studentsQuery.isPending && students.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          ) : null}

          {students.map((student) => {
            const latestEnrollment = student.enrollments[0];

            return (
              <div
                key={student.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      رقم القيد: {student.admissionNo ?? "-"} | الميلاد: {formatDate(student.birthDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      أولياء الأمور: {student.guardians.length} | القيود: {student.enrollments.length}
                    </p>
                    {latestEnrollment ? (
                      <p className="text-xs text-muted-foreground">
                        آخر قيد: {latestEnrollment.academicYear.code} /{" "}
                        {latestEnrollment.section.code} (
                        {translateStudentEnrollmentStatus(latestEnrollment.status)})
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{translateStudentGender(student.gender)}</Badge>
                    <Badge variant="outline">
                      {student.bloodType ? student.bloodType.name : "بدون فصيلة"}
                    </Badge>
                    <Badge variant={orphanBadgeVariant(student.orphanStatus)}>
                      {translateStudentOrphanStatus(student.orphanStatus)}
                    </Badge>
                    <Badge variant={healthBadgeVariant(student.healthStatus)}>
                      {student.healthStatus
                        ? translateStudentHealthStatus(student.healthStatus)
                        : "غير محدد"}
                    </Badge>
                    <Badge variant={student.isActive ? "default" : "outline"}>
                      {student.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(student)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(student)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    {student.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(student)}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || studentsQuery.isFetching}
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
                  studentsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void studentsQuery.refetch()}
                disabled={studentsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${studentsQuery.isFetching ? "animate-spin" : ""}`}
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






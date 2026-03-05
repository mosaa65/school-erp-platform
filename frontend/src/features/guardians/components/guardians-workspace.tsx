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
  useCreateGuardianMutation,
  useDeleteGuardianMutation,
  useUpdateGuardianMutation,
} from "@/features/guardians/hooks/use-guardians-mutations";
import { useGuardianGenderOptionsQuery } from "@/features/guardians/hooks/use-gender-options-query";
import { useGuardianIdTypeOptionsQuery } from "@/features/guardians/hooks/use-id-type-options-query";
import { useGuardiansQuery } from "@/features/guardians/hooks/use-guardians-query";
import { translateGuardianRelationship, translateStudentGender } from "@/lib/i18n/ar";
import type { GuardianListItem, GuardianRelationship, StudentGender } from "@/lib/api/client";

type GuardianFormState = {
  fullName: string;
  genderId: string;
  idNumber: string;
  idTypeId: string;
  phonePrimary: string;
  phoneSecondary: string;
  whatsappNumber: string;
  residenceText: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const RELATIONSHIP_ORDER: GuardianRelationship[] = [
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "UNCLE",
  "AUNT",
  "GRANDFATHER",
  "GRANDMOTHER",
  "OTHER",
];

const STUDENT_GENDER_CODES: StudentGender[] = ["MALE", "FEMALE", "OTHER"];

const DEFAULT_FORM_STATE: GuardianFormState = {
  fullName: "",
  genderId: "",
  idNumber: "",
  idTypeId: "",
  phonePrimary: "",
  phoneSecondary: "",
  whatsappNumber: "",
  residenceText: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isStudentGenderCode(value: string): value is StudentGender {
  return STUDENT_GENDER_CODES.includes(value as StudentGender);
}

function toFormState(guardian: GuardianListItem): GuardianFormState {
  return {
    fullName: guardian.fullName,
    genderId: guardian.genderId ? String(guardian.genderId) : "",
    idNumber: guardian.idNumber ?? "",
    idTypeId: guardian.idTypeId ? String(guardian.idTypeId) : "",
    phonePrimary: guardian.phonePrimary ?? "",
    phoneSecondary: guardian.phoneSecondary ?? "",
    whatsappNumber: guardian.whatsappNumber ?? "",
    residenceText: guardian.residenceText ?? "",
    isActive: guardian.isActive,
  };
}

function toRelationshipPreview(guardian: GuardianListItem): string {
  if (guardian.students.length === 0) {
    return "لا يوجد طلاب مرتبطون";
  }

  const primary = guardian.students.find((item) => item.isPrimary);
  if (primary) {
    return `${translateGuardianRelationship(primary.relationship)} - ${primary.student.fullName}`;
  }

  const sorted = [...guardian.students].sort(
    (a, b) =>
      RELATIONSHIP_ORDER.indexOf(a.relationship) - RELATIONSHIP_ORDER.indexOf(b.relationship),
  );
  const first = sorted[0];
  return `${translateGuardianRelationship(first.relationship)} - ${first.student.fullName}`;
}

export function GuardiansWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("guardians.create");
  const canUpdate = hasPermission("guardians.update");
  const canDelete = hasPermission("guardians.delete");
  const canReadGenders = hasPermission("lookup-genders.read");
  const canReadIdTypes = hasPermission("lookup-id-types.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [idTypeFilter, setIdTypeFilter] = React.useState<string>("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingGuardianId, setEditingGuardianId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<GuardianFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const guardiansQuery = useGuardiansQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    idTypeId: idTypeFilter === "all" ? undefined : Number(idTypeFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const genderOptionsQuery = useGuardianGenderOptionsQuery();
  const idTypeOptionsQuery = useGuardianIdTypeOptionsQuery();

  const createMutation = useCreateGuardianMutation();
  const updateMutation = useUpdateGuardianMutation();
  const deleteMutation = useDeleteGuardianMutation();

  const guardians = React.useMemo(
    () => guardiansQuery.data?.data ?? [],
    [guardiansQuery.data?.data],
  );
  const genderOptions = React.useMemo(
    () => genderOptionsQuery.data ?? [],
    [genderOptionsQuery.data],
  );
  const idTypeOptions = React.useMemo(
    () => idTypeOptionsQuery.data ?? [],
    [idTypeOptionsQuery.data],
  );
  const pagination = guardiansQuery.data?.pagination;
  const isEditing = editingGuardianId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = guardians.some((guardian) => guardian.id === editingGuardianId);
    if (!stillExists) {
      setEditingGuardianId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingGuardianId, guardians, isEditing]);

  React.useEffect(() => {
    if (isEditing || formState.genderId || !canReadGenders) {
      return;
    }

    if (genderOptions.length === 0) {
      return;
    }

    const preferred = genderOptions.find((option) => option.code === "MALE");
    const defaultGender = preferred ?? genderOptions[0];
    setFormState((prev) =>
      prev.genderId
        ? prev
        : {
            ...prev,
            genderId: String(defaultGender.id),
          },
    );
  }, [canReadGenders, formState.genderId, genderOptions, isEditing]);

  const resetForm = () => {
    setEditingGuardianId(null);
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

    if (!formState.genderId) {
      setFormError("الجنس مطلوب.");
      return false;
    }

    if (formState.fullName.trim().length > 150) {
      setFormError("الاسم الكامل يجب ألا يتجاوز 150 حرفًا.");
      return false;
    }

    if (formState.idNumber.trim().length > 30) {
      setFormError("رقم الهوية يجب ألا يتجاوز 30 حرفًا.");
      return false;
    }

    if (formState.phonePrimary.trim().length > 20) {
      setFormError("الهاتف الأساسي يجب ألا يتجاوز 20 حرفًا.");
      return false;
    }

    if (formState.phoneSecondary.trim().length > 20) {
      setFormError("الهاتف الاحتياطي يجب ألا يتجاوز 20 حرفًا.");
      return false;
    }

    if (formState.whatsappNumber.trim().length > 20) {
      setFormError("رقم واتساب يجب ألا يتجاوز 20 حرفًا.");
      return false;
    }

    if (formState.residenceText.trim().length > 255) {
      setFormError("العنوان يجب ألا يتجاوز 255 حرفًا.");
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

    const selectedGender = genderOptions.find(
      (option) => option.id === Number(formState.genderId),
    );
    const mappedGender =
      selectedGender?.code && isStudentGenderCode(selectedGender.code)
        ? selectedGender.code
        : undefined;

    const payload = {
      fullName: formState.fullName.trim(),
      gender: mappedGender,
      genderId: formState.genderId ? Number(formState.genderId) : undefined,
      idNumber: toOptionalString(formState.idNumber),
      idTypeId: formState.idTypeId ? Number(formState.idTypeId) : null,
      phonePrimary: toOptionalString(formState.phonePrimary),
      phoneSecondary: toOptionalString(formState.phoneSecondary),
      whatsappNumber: toOptionalString(formState.whatsappNumber),
      residenceText: toOptionalString(formState.residenceText),
      isActive: formState.isActive,
    };

    if (isEditing && editingGuardianId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية guardians.update.");
        return;
      }

      updateMutation.mutate(
        {
          guardianId: editingGuardianId,
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
      setFormError("لا تملك صلاحية guardians.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (guardian: GuardianListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingGuardianId(guardian.id);
    const nextState = toFormState(guardian);
    if (!nextState.genderId) {
      const mapped = genderOptions.find((option) => option.code === guardian.gender);
      if (mapped) {
        nextState.genderId = String(mapped.id);
      }
    }
    setFormState(nextState);
  };

  const handleToggleActive = (guardian: GuardianListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      guardianId: guardian.id,
      payload: {
        isActive: !guardian.isActive,
      },
    });
  };

  const handleDelete = (guardian: GuardianListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف ولي الأمر ${guardian.fullName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(guardian.id, {
      onSuccess: () => {
        if (editingGuardianId === guardian.id) {
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
            {isEditing ? "تعديل ولي أمر" : "إنشاء ولي أمر"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث بيانات ولي الأمر."
              : "إضافة ملف جديد لولي الأمر ضمن نظام الطلاب."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>guardians.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم الكامل *</label>
                <Input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="أحمد محمد صالح"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الجنس *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.genderId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      genderId: event.target.value,
                    }))
                  }
                  disabled={!canReadGenders || genderOptionsQuery.isLoading}
                >
                  <option value="">اختر الجنس</option>
                  {genderOptions.map((option) => {
                    const translated =
                      option.code && isStudentGenderCode(option.code)
                        ? translateStudentGender(option.code)
                        : option.nameAr ?? option.name ?? option.code ?? String(option.id);

                    return (
                      <option key={option.id} value={option.id}>
                        {option.nameAr ?? translated}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">رقم الهوية</label>
                  <Input
                    value={formState.idNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idNumber: event.target.value }))
                    }
                    placeholder="مثال: 90909012"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نوع الهوية</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.idTypeId}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idTypeId: event.target.value }))
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
                  <label className="text-xs font-medium text-muted-foreground">الهاتف الأساسي</label>
                  <Input
                    value={formState.phonePrimary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, phonePrimary: event.target.value }))
                    }
                    placeholder="+967777111222"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    رقم واتساب
                  </label>
                  <Input
                    value={formState.whatsappNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        whatsappNumber: event.target.value,
                      }))
                    }
                    placeholder="+967777111222"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">العنوان</label>
                <Input
                  value={formState.residenceText}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      residenceText: event.target.value,
                    }))
                  }
                  placeholder="صنعاء - حي الصافية"
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
                  {isEditing ? "حفظ التعديلات" : "إنشاء ولي أمر"}
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
            <CardTitle>قائمة أولياء الأمور</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة أولياء الأمور مع فلترة حسب النوع والحالة.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_150px_170px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم/الهاتف/الهوية..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={genderFilter}
              onChange={(event) => {
                setPage(1);
                setGenderFilter(event.target.value);
              }}
              disabled={!canReadGenders || genderOptionsQuery.isLoading}
            >
              <option value="all">كل الأجناس</option>
              {genderOptions.map((option) => {
                const translated =
                  option.code && isStudentGenderCode(option.code)
                    ? translateStudentGender(option.code)
                    : option.nameAr ?? option.name ?? option.code ?? String(option.id);

                return (
                  <option key={option.id} value={option.id}>
                    {option.nameAr ?? translated}
                  </option>
                );
              })}
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
          {guardiansQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {guardiansQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {guardiansQuery.error instanceof Error
                ? guardiansQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}

          {!guardiansQuery.isPending && guardians.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          ) : null}

          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{guardian.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    الهوية: {guardian.idNumber ?? "-"} ({guardian.idType?.nameAr ?? "غير محدد"}) | الهاتف:{" "}
                    {guardian.phonePrimary ?? "-"} | واتساب:{" "}
                    {guardian.whatsappNumber ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الطلاب: {guardian.students.length} ({toRelationshipPreview(guardian)})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">
                    {guardian.genderLookup?.nameAr ?? translateStudentGender(guardian.gender)}
                  </Badge>
                  <Badge variant={guardian.isActive ? "default" : "outline"}>
                    {guardian.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(guardian)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(guardian)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {guardian.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(guardian)}
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
                disabled={!pagination || pagination.page <= 1 || guardiansQuery.isFetching}
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
                  guardiansQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void guardiansQuery.refetch()}
                disabled={guardiansQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${guardiansQuery.isFetching ? "animate-spin" : ""}`}
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






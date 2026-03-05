"use client";

import * as React from "react";
import { Link2, LoaderCircle, PencilLine, RefreshCw, Search, Trash2 } from "lucide-react";
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
  useCreateStudentGuardianMutation,
  useDeleteStudentGuardianMutation,
  useUpdateStudentGuardianMutation,
} from "@/features/student-guardians/hooks/use-student-guardians-mutations";
import { useRelationshipTypeOptionsQuery } from "@/features/student-guardians/hooks/use-relationship-type-options-query";
import { useStudentGuardiansQuery } from "@/features/student-guardians/hooks/use-student-guardians-query";
import { useStudentOptionsQuery } from "@/features/student-guardians/hooks/use-student-options-query";
import { useGuardianOptionsQuery } from "@/features/student-guardians/hooks/use-guardian-options-query";
import type {
  GuardianRelationship,
  LookupCatalogListItem,
  StudentGuardianListItem,
} from "@/lib/api/client";
import { translateGuardianRelationship } from "@/lib/i18n/ar";

type RelationFormState = {
  studentId: string;
  guardianId: string;
  relationshipTypeId: string;
  isPrimary: boolean;
  canReceiveNotifications: boolean;
  canPickup: boolean;
  startDate: string;
  endDate: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: RelationFormState = {
  studentId: "",
  guardianId: "",
  relationshipTypeId: "",
  isPrimary: false,
  canReceiveNotifications: true,
  canPickup: true,
  startDate: "",
  endDate: "",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function toFormState(item: StudentGuardianListItem): RelationFormState {
  return {
    studentId: item.studentId,
    guardianId: item.guardianId,
    relationshipTypeId: item.relationshipTypeId ? String(item.relationshipTypeId) : "",
    isPrimary: item.isPrimary,
    canReceiveNotifications: item.canReceiveNotifications,
    canPickup: item.canPickup,
    startDate: toDateInputValue(item.startDate),
    endDate: toDateInputValue(item.endDate),
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function mapRelationshipCodeToEnum(code: string): GuardianRelationship | null {
  const normalized = code.trim().toUpperCase();

  if (
    normalized === "FATHER" ||
    normalized === "MOTHER" ||
    normalized === "BROTHER" ||
    normalized === "SISTER" ||
    normalized === "UNCLE" ||
    normalized === "AUNT" ||
    normalized === "GRANDFATHER" ||
    normalized === "GRANDMOTHER" ||
    normalized === "OTHER"
  ) {
    return normalized as GuardianRelationship;
  }

  if (normalized === "UNCLE_PATERNAL" || normalized === "UNCLE_MATERNAL") {
    return "UNCLE";
  }

  if (normalized === "AUNT_PATERNAL" || normalized === "AUNT_MATERNAL") {
    return "AUNT";
  }

  if (normalized === "GUARDIAN") {
    return "OTHER";
  }

  return null;
}

function getRelationshipLookupCandidates(
  relationship: GuardianRelationship,
): string[] {
  switch (relationship) {
    case "UNCLE":
      return ["UNCLE", "UNCLE_PATERNAL", "UNCLE_MATERNAL"];
    case "AUNT":
      return ["AUNT", "AUNT_PATERNAL", "AUNT_MATERNAL"];
    case "OTHER":
      return ["OTHER", "GUARDIAN"];
    default:
      return [relationship];
  }
}

function findRelationshipLookupByEnum(
  options: LookupCatalogListItem[],
  relationship: GuardianRelationship,
): LookupCatalogListItem | undefined {
  const candidates = getRelationshipLookupCandidates(relationship);

  return candidates
    .map((candidate) => options.find((option) => option.code === candidate))
    .find((option): option is LookupCatalogListItem => Boolean(option));
}

function renderDateRange(item: StudentGuardianListItem): string {
  const start = toDateInputValue(item.startDate);
  const end = toDateInputValue(item.endDate);

  if (!start && !end) {
    return "غير محدد";
  }

  if (!start) {
    return `حتى ${end}`;
  }

  if (!end) {
    return `من ${start}`;
  }

  return `${start} - ${end}`;
}

export function StudentGuardiansWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-guardians.create");
  const canUpdate = hasPermission("student-guardians.update");
  const canDelete = hasPermission("student-guardians.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadGuardians = hasPermission("guardians.read");
  const canReadRelationshipTypes = hasPermission("lookup-relationship-types.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [guardianFilter, setGuardianFilter] = React.useState("all");
  const [relationshipTypeFilter, setRelationshipTypeFilter] = React.useState("all");
  const [primaryFilter, setPrimaryFilter] = React.useState<"all" | "primary" | "secondary">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingRelationId, setEditingRelationId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<RelationFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const relationsQuery = useStudentGuardiansQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    guardianId: guardianFilter === "all" ? undefined : guardianFilter,
    relationshipTypeId:
      relationshipTypeFilter === "all" ? undefined : Number(relationshipTypeFilter),
    isPrimary: primaryFilter === "all" ? undefined : primaryFilter === "primary",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const studentsQuery = useStudentOptionsQuery();
  const guardiansQuery = useGuardianOptionsQuery();
  const relationshipTypeOptionsQuery = useRelationshipTypeOptionsQuery();

  const createMutation = useCreateStudentGuardianMutation();
  const updateMutation = useUpdateStudentGuardianMutation();
  const deleteMutation = useDeleteStudentGuardianMutation();

  const relations = React.useMemo(
    () => relationsQuery.data?.data ?? [],
    [relationsQuery.data?.data],
  );
  const relationshipTypeOptions = React.useMemo(() => {
    const options = relationshipTypeOptionsQuery.data ?? [];
    return options.filter((option) => option.code && mapRelationshipCodeToEnum(option.code));
  }, [relationshipTypeOptionsQuery.data]);
  const pagination = relationsQuery.data?.pagination;
  const isEditing = editingRelationId !== null;

  const hasDependenciesReadPermissions =
    canReadStudents && canReadGuardians && canReadRelationshipTypes;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = relations.some((item) => item.id === editingRelationId);
    if (!stillExists) {
      setEditingRelationId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingRelationId, isEditing, relations]);

  React.useEffect(() => {
    if (isEditing || formState.relationshipTypeId || !canReadRelationshipTypes) {
      return;
    }

    if (relationshipTypeOptions.length === 0) {
      return;
    }

    const preferred = findRelationshipLookupByEnum(
      relationshipTypeOptions,
      "FATHER",
    );
    const defaultOption = preferred ?? relationshipTypeOptions[0];
    setFormState((prev) =>
      prev.relationshipTypeId
        ? prev
        : {
            ...prev,
            relationshipTypeId: String(defaultOption.id),
          },
    );
  }, [
    canReadRelationshipTypes,
    formState.relationshipTypeId,
    isEditing,
    relationshipTypeOptions,
  ]);

  const resetForm = () => {
    setEditingRelationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.studentId || !formState.guardianId) {
      setFormError("الطالب وولي الأمر حقول مطلوبة.");
      return false;
    }

    if (!formState.relationshipTypeId) {
      setFormError("صلة القرابة مطلوبة.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    if (
      formState.startDate &&
      formState.endDate &&
      formState.startDate.localeCompare(formState.endDate) > 0
    ) {
      setFormError("تاريخ البداية يجب أن يسبق تاريخ النهاية.");
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

    const selectedRelationshipType = relationshipTypeOptions.find(
      (option) => option.id === Number(formState.relationshipTypeId),
    );
    const mappedRelationship =
      selectedRelationshipType?.code &&
      mapRelationshipCodeToEnum(selectedRelationshipType.code);

    if (!selectedRelationshipType || !mappedRelationship) {
      setFormError("تعذر مطابقة نوع صلة القرابة. حدّث الخيارات وحاول مرة أخرى.");
      return;
    }

    const payload = {
      studentId: formState.studentId,
      guardianId: formState.guardianId,
      relationship: mappedRelationship,
      relationshipTypeId: selectedRelationshipType.id,
      isPrimary: formState.isPrimary,
      canReceiveNotifications: formState.canReceiveNotifications,
      canPickup: formState.canPickup,
      startDate: toOptionalString(formState.startDate),
      endDate: toOptionalString(formState.endDate),
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingRelationId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية student-guardians.update.");
        return;
      }

      updateMutation.mutate(
        {
          relationId: editingRelationId,
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
      setFormError("لا تملك صلاحية student-guardians.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: StudentGuardianListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingRelationId(item.id);
    const nextState = toFormState(item);
    if (!nextState.relationshipTypeId) {
      const mappedLookup = findRelationshipLookupByEnum(
        relationshipTypeOptions,
        item.relationship,
      );
      if (mappedLookup) {
        nextState.relationshipTypeId = String(mappedLookup.id);
      }
    }
    setFormState(nextState);
  };

  const handleToggleActive = (item: StudentGuardianListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      relationId: item.id,
      payload: {
        isActive: !item.isActive,
      },
    });
  };

  const handleDelete = (item: StudentGuardianListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف العلاقة بين ${item.student.fullName} و ${item.guardian.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingRelationId === item.id) {
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
            <Link2 className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل علاقة طالب-ولي أمر" : "إنشاء علاقة طالب-ولي أمر"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث خصائص العلاقة الحالية."
              : "إضافة ربط جديد بين الطالب وولي الأمر ضمن النظام."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>student-guardians.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.studentId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, studentId: event.target.value }))
                  }
                  disabled={!canReadStudents}
                >
                  <option value="">اختر الطالب</option>
                  {(studentsQuery.data ?? []).map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} ({student.admissionNo ?? "غير متوفر"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ولي الأمر *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.guardianId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, guardianId: event.target.value }))
                  }
                  disabled={!canReadGuardians}
                >
                  <option value="">اختر ولي الأمر</option>
                  {(guardiansQuery.data ?? []).map((guardian) => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.fullName} ({guardian.phonePrimary ?? "لا يوجد رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">صلة القرابة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.relationshipTypeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      relationshipTypeId: event.target.value,
                    }))
                  }
                  disabled={
                    !canReadRelationshipTypes || relationshipTypeOptionsQuery.isLoading
                  }
                >
                  <option value="">اختر صلة القرابة</option>
                  {relationshipTypeOptions.map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.nameAr ??
                        (value.code
                          ? translateGuardianRelationship(
                              mapRelationshipCodeToEnum(value.code) ?? "OTHER",
                            )
                          : String(value.id))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ البداية</label>
                  <Input
                    type="date"
                    value={formState.startDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ النهاية</label>
                  <Input
                    type="date"
                    value={formState.endDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, endDate: event.target.value }))
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
                  placeholder="مثال: جهة الاتصال الأساسية لمتابعة الحضور"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>صلة أساسية</span>
                  <input
                    type="checkbox"
                    checked={formState.isPrimary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isPrimary: event.target.checked }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>يستقبل الإشعارات</span>
                  <input
                    type="checkbox"
                    checked={formState.canReceiveNotifications}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        canReceiveNotifications: event.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>مصرح بالاستلام</span>
                  <input
                    type="checkbox"
                    checked={formState.canPickup}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, canPickup: event.target.checked }))
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
                  يلزم صلاحيات القراءة: <code>students.read</code> و{" "}
                  <code>guardians.read</code> و <code>lookup-relationship-types.read</code>.
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
                    <Link2 className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء علاقة"}
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
            <CardTitle>قائمة روابط الطلاب وأولياء الأمور</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة علاقات الطلاب بأولياء الأمور مع تحديد العلاقة الأساسية والصلاحيات.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_170px_150px_150px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالطالب/ولي الأمر/الهاتف..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={studentFilter}
              onChange={(event) => {
                setPage(1);
                setStudentFilter(event.target.value);
              }}
              disabled={!canReadStudents}
            >
              <option value="all">كل الطلاب</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admissionNo ?? student.fullName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={guardianFilter}
              onChange={(event) => {
                setPage(1);
                setGuardianFilter(event.target.value);
              }}
              disabled={!canReadGuardians}
            >
              <option value="all">كل أولياء الأمور</option>
              {(guardiansQuery.data ?? []).map((guardian) => (
                <option key={guardian.id} value={guardian.id}>
                  {guardian.fullName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={relationshipTypeFilter}
              onChange={(event) => {
                setPage(1);
                setRelationshipTypeFilter(event.target.value);
              }}
              disabled={!canReadRelationshipTypes || relationshipTypeOptionsQuery.isLoading}
            >
              <option value="all">كل صلات القرابة</option>
              {relationshipTypeOptions.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.nameAr ??
                    (value.code
                      ? translateGuardianRelationship(
                          mapRelationshipCodeToEnum(value.code) ?? "OTHER",
                        )
                      : String(value.id))}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={primaryFilter}
              onChange={(event) => {
                setPage(1);
                setPrimaryFilter(event.target.value as "all" | "primary" | "secondary");
              }}
            >
              <option value="all">كل الأولويات</option>
              <option value="primary">الأساسية فقط</option>
              <option value="secondary">غير الأساسية فقط</option>
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
          {relationsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {relationsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {relationsQuery.error instanceof Error
                ? relationsQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}

          {!relationsQuery.isPending && relations.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {relations.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.student.fullName} ({item.student.admissionNo ?? "غير متوفر"}) -{" "}
                    {item.guardian.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    هاتف ولي الأمر: {item.guardian.phonePrimary ?? "-"} | واتساب:{" "}
                    {item.guardian.whatsappNumber ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    فترة الارتباط: {renderDateRange(item)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ملاحظات: {item.notes ?? "-"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">
                    {item.relationshipTypeLookup?.nameAr ??
                      translateGuardianRelationship(item.relationship)}
                  </Badge>
                  <Badge variant={item.isPrimary ? "default" : "secondary"}>
                    {item.isPrimary ? "أساسية" : "غير أساسية"}
                  </Badge>
                  <Badge variant={item.canReceiveNotifications ? "default" : "outline"}>
                    إشعارات: {item.canReceiveNotifications ? "نعم" : "لا"}
                  </Badge>
                  <Badge variant={item.canPickup ? "default" : "outline"}>
                    استلام: {item.canPickup ? "نعم" : "لا"}
                  </Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
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
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(item)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {item.isActive ? "تعطيل" : "تفعيل"}
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
              الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || relationsQuery.isFetching}
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
                  relationsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void relationsQuery.refetch()}
                disabled={relationsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${relationsQuery.isFetching ? "animate-spin" : ""}`}
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







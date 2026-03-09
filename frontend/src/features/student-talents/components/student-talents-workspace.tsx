"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Sparkles,
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
import { useStudentOptionsQuery } from "@/features/student-books/hooks/use-student-options-query";
import { useTalentOptionsQuery } from "@/features/employee-talents/hooks/use-talent-options-query";
import {
  useCreateStudentTalentMutation,
  useDeleteStudentTalentMutation,
  useUpdateStudentTalentMutation,
} from "@/features/student-talents/hooks/use-student-talents-mutations";
import { useStudentTalentsQuery } from "@/features/student-talents/hooks/use-student-talents-query";
import type { StudentTalentListItem } from "@/lib/api/client";

type StudentTalentFormState = {
  studentId: string;
  talentId: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentTalentFormState = {
  studentId: "",
  talentId: "",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(mapping: StudentTalentListItem): StudentTalentFormState {
  return {
    studentId: mapping.studentId,
    talentId: mapping.talentId,
    notes: mapping.notes ?? "",
    isActive: mapping.isActive,
  };
}

export function StudentTalentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-talents.create");
  const canUpdate = hasPermission("student-talents.update");
  const canDelete = hasPermission("student-talents.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadTalents = hasPermission("talents.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [talentFilter, setTalentFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingMappingId, setEditingMappingId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<StudentTalentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const mappingsQuery = useStudentTalentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    talentId: talentFilter === "all" ? undefined : talentFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const studentsQuery = useStudentOptionsQuery();
  const talentsQuery = useTalentOptionsQuery();

  const createMutation = useCreateStudentTalentMutation();
  const updateMutation = useUpdateStudentTalentMutation();
  const deleteMutation = useDeleteStudentTalentMutation();

  const mappings = React.useMemo(
    () => mappingsQuery.data?.data ?? [],
    [mappingsQuery.data?.data],
  );
  const pagination = mappingsQuery.data?.pagination;
  const isEditing = editingMappingId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = mappings.some((item) => item.id === editingMappingId);
    if (!stillExists) {
      setEditingMappingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingMappingId, isEditing, mappings]);

  const resetForm = () => {
    setEditingMappingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.studentId) {
      setFormError("الطالب مطلوب.");
      return false;
    }

    if (!formState.talentId) {
      setFormError("الموهبة مطلوبة.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
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
      studentId: formState.studentId,
      talentId: formState.talentId,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingMappingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-talents.update.");
        return;
      }

      updateMutation.mutate(
        {
          mappingId: editingMappingId,
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
      setFormError("لا تملك الصلاحية المطلوبة: student-talents.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (mapping: StudentTalentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingMappingId(mapping.id);
    setFormState(toFormState(mapping));
  };

  const handleDelete = (mapping: StudentTalentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ربط ${mapping.student.fullName} مع موهبة ${mapping.talent.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(mapping.id, {
      onSuccess: () => {
        if (editingMappingId === mapping.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadStudents && canReadTalents;

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل ربط موهبة طالب" : "إضافة موهبة طالب"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث ربط الطالب بالموهبة."
              : "ربط طالب بموهبة من قاموس المواهب."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>student-talents.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
                <select
                  data-testid="student-talent-form-student"
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
                      {student.fullName} ({student.admissionNo ?? "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الموهبة *</label>
                <select
                  data-testid="student-talent-form-talent"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.talentId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, talentId: event.target.value }))
                  }
                  disabled={!canReadTalents}
                >
                  <option value="">اختر الموهبة</option>
                  {(talentsQuery.data ?? []).map((talent) => (
                    <option key={talent.id} value={talent.id}>
                      {talent.name} ({talent.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
                <Input
                  data-testid="student-talent-form-notes"
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="يشارك في نشاط الإلقاء"
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشط</span>
                <input
                  data-testid="student-talent-form-active"
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
                  يتطلب هذا الجزء صلاحيات القراءة: <code>students.read</code> و <code>talents.read</code>.
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  data-testid="student-talent-form-submit"
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
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إضافة الربط"}
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
            <CardTitle>مواهب الطلاب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة ربط الطلاب بالمواهب المرجعية.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_170px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالطالب أو الموهبة..."
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
            >
              <option value="all">كل الطلاب</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.admissionNo ?? "بدون رقم"})
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={talentFilter}
              onChange={(event) => {
                setPage(1);
                setTalentFilter(event.target.value);
              }}
            >
              <option value="all">كل المواهب</option>
              {(talentsQuery.data ?? []).map((talent) => (
                <option key={talent.id} value={talent.id}>
                  {talent.name} ({talent.code})
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
          {mappingsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {mappingsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {mappingsQuery.error instanceof Error
                ? mappingsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!mappingsQuery.isPending && mappings.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {mappings.map((mapping) => (
            <div
              key={mapping.id}
              data-testid="student-talent-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {mapping.student.fullName} ({mapping.student.admissionNo ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الموهبة: {mapping.talent.name} ({mapping.talent.code})
                  </p>
                  {mapping.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {mapping.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={mapping.talent.isActive ? "secondary" : "outline"}>
                    {mapping.talent.isActive ? "الموهبة نشطة" : "الموهبة غير نشطة"}
                  </Badge>
                  <Badge variant={mapping.isActive ? "default" : "outline"}>
                    {mapping.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="student-talent-card-edit"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(mapping)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  data-testid="student-talent-card-delete"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(mapping)}
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
                disabled={!pagination || pagination.page <= 1 || mappingsQuery.isFetching}
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
                  mappingsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void mappingsQuery.refetch()}
                disabled={mappingsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${mappingsQuery.isFetching ? "animate-spin" : ""}`}
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

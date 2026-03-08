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
import { useStudentOptionsQuery } from "@/features/student-books/hooks/use-student-options-query";
import {
  useCreateStudentSiblingMutation,
  useDeleteStudentSiblingMutation,
  useUpdateStudentSiblingMutation,
} from "@/features/student-siblings/hooks/use-student-siblings-mutations";
import { useStudentSiblingsQuery } from "@/features/student-siblings/hooks/use-student-siblings-query";
import type {
  StudentSiblingListItem,
  StudentSiblingRelationship,
} from "@/lib/api/client";

const RELATIONSHIP_LABELS: Record<StudentSiblingRelationship, string> = {
  BROTHER: "أخ",
  SISTER: "أخت",
};

type StudentSiblingFormState = {
  studentId: string;
  siblingId: string;
  relationship: StudentSiblingRelationship;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentSiblingFormState = {
  studentId: "",
  siblingId: "",
  relationship: "BROTHER",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: StudentSiblingListItem): StudentSiblingFormState {
  return {
    studentId: item.studentId,
    siblingId: item.siblingId,
    relationship: item.relationship,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function StudentSiblingsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-siblings.create");
  const canUpdate = hasPermission("student-siblings.update");
  const canDelete = hasPermission("student-siblings.delete");
  const canReadStudents = hasPermission("students.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [siblingFilter, setSiblingFilter] = React.useState("all");
  const [relationshipFilter, setRelationshipFilter] = React.useState<
    StudentSiblingRelationship | "all"
  >("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingSiblingId, setEditingSiblingId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<StudentSiblingFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const siblingsQuery = useStudentSiblingsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    siblingId: siblingFilter === "all" ? undefined : siblingFilter,
    relationship: relationshipFilter === "all" ? undefined : relationshipFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const studentsQuery = useStudentOptionsQuery();

  const createMutation = useCreateStudentSiblingMutation();
  const updateMutation = useUpdateStudentSiblingMutation();
  const deleteMutation = useDeleteStudentSiblingMutation();

  const siblings = React.useMemo(() => siblingsQuery.data?.data ?? [], [siblingsQuery.data?.data]);
  const pagination = siblingsQuery.data?.pagination;
  const isEditing = editingSiblingId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = siblings.some((item) => item.id === editingSiblingId);
    if (!stillExists) {
      setEditingSiblingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingSiblingId, isEditing, siblings]);

  const resetForm = () => {
    setEditingSiblingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.studentId || !formState.siblingId) {
      setFormError("الطالب والأخ/الأخت حقول مطلوبة.");
      return false;
    }

    if (formState.studentId === formState.siblingId) {
      setFormError("لا يمكن اختيار نفس الطالب في الطرفين.");
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
      siblingId: formState.siblingId,
      relationship: formState.relationship,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingSiblingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية student-siblings.update.");
        return;
      }

      updateMutation.mutate(
        {
          siblingId: editingSiblingId,
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
      setFormError("لا تملك صلاحية student-siblings.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: StudentSiblingListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingSiblingId(item.id);
    setFormState(toFormState(item));
  };

  const handleDelete = (item: StudentSiblingListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ربط ${item.student.fullName} مع ${item.sibling.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingSiblingId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل ربط إخوة" : "إضافة ربط إخوة"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث علاقة الأخوة بين الطلاب."
              : "ربط الطلاب كإخوة ضمن نفس المدرسة."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>student-siblings.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
                <select
                  data-testid="student-sibling-form-student"
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
                <label className="text-xs font-medium text-muted-foreground">الأخ/الأخت *</label>
                <select
                  data-testid="student-sibling-form-sibling"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.siblingId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, siblingId: event.target.value }))
                  }
                  disabled={!canReadStudents}
                >
                  <option value="">اختر الأخ/الأخت</option>
                  {(studentsQuery.data ?? []).map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} ({student.admissionNo ?? "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع العلاقة *</label>
                <select
                  data-testid="student-sibling-form-relationship"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.relationship}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      relationship: event.target.value as StudentSiblingRelationship,
                    }))
                  }
                >
                  {(Object.keys(RELATIONSHIP_LABELS) as StudentSiblingRelationship[]).map(
                    (relationship) => (
                      <option key={relationship} value={relationship}>
                        {RELATIONSHIP_LABELS[relationship]}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
                <Input
                  data-testid="student-sibling-form-notes"
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشط</span>
                <input
                  data-testid="student-sibling-form-active"
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
                  data-testid="student-sibling-form-submit"
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isFormSubmitting || (!canCreate && !isEditing)}
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
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
            <CardTitle>الإخوة في المدرسة</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة الروابط الأسرية بين الطلاب.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_170px_130px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالطالب..."
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
              value={siblingFilter}
              onChange={(event) => {
                setPage(1);
                setSiblingFilter(event.target.value);
              }}
            >
              <option value="all">كل الإخوة</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.admissionNo ?? "بدون رقم"})
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={relationshipFilter}
              onChange={(event) => {
                setPage(1);
                setRelationshipFilter(
                  event.target.value as StudentSiblingRelationship | "all",
                );
              }}
            >
              <option value="all">كل العلاقات</option>
              {(Object.keys(RELATIONSHIP_LABELS) as StudentSiblingRelationship[]).map(
                (relationship) => (
                  <option key={relationship} value={relationship}>
                    {RELATIONSHIP_LABELS[relationship]}
                  </option>
                ),
              )}
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
          {siblingsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {siblingsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {siblingsQuery.error instanceof Error ? siblingsQuery.error.message : "فشل التحميل"}
            </div>
          ) : null}

          {!siblingsQuery.isPending && siblings.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {siblings.map((item) => (
            <div
              key={item.id}
              data-testid="student-sibling-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.student.fullName} ({item.student.admissionNo ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الأخ/الأخت: {item.sibling.fullName} ({item.sibling.admissionNo ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    نوع العلاقة: {RELATIONSHIP_LABELS[item.relationship]}
                  </p>
                  {item.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {item.notes}</p>
                  ) : null}
                </div>

                <Badge variant={item.isActive ? "default" : "outline"}>
                  {item.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="student-sibling-card-edit"
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
                  data-testid="student-sibling-card-delete"
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
                disabled={!pagination || pagination.page <= 1 || siblingsQuery.isFetching}
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
                  siblingsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void siblingsQuery.refetch()}
                disabled={siblingsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${siblingsQuery.isFetching ? "animate-spin" : ""}`}
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

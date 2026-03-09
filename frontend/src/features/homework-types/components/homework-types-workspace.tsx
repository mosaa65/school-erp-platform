"use client";

import * as React from "react";
import {
  BookOpenText,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  ShieldAlert,
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
  useCreateHomeworkTypeMutation,
  useDeleteHomeworkTypeMutation,
  useUpdateHomeworkTypeMutation,
} from "@/features/homework-types/hooks/use-homework-types-mutations";
import { useHomeworkTypesQuery } from "@/features/homework-types/hooks/use-homework-types-query";
import type { HomeworkTypeListItem } from "@/lib/api/client";

type HomeworkTypeFormState = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: HomeworkTypeFormState = {
  code: "",
  name: "",
  description: "",
  isSystem: false,
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: HomeworkTypeListItem): HomeworkTypeFormState {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    isSystem: item.isSystem,
    isActive: item.isActive,
  };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function HomeworkTypesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("homework-types.create");
  const canUpdate = hasPermission("homework-types.update");
  const canDelete = hasPermission("homework-types.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [systemFilter, setSystemFilter] = React.useState<"all" | "system" | "custom">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingHomeworkTypeId, setEditingHomeworkTypeId] = React.useState<string | null>(
    null,
  );
  const [formState, setFormState] = React.useState<HomeworkTypeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const homeworkTypesQuery = useHomeworkTypesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isSystem:
      systemFilter === "all" ? undefined : systemFilter === "system",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateHomeworkTypeMutation();
  const updateMutation = useUpdateHomeworkTypeMutation();
  const deleteMutation = useDeleteHomeworkTypeMutation();

  const homeworkTypes = React.useMemo(
    () => homeworkTypesQuery.data?.data ?? [],
    [homeworkTypesQuery.data?.data],
  );
  const pagination = homeworkTypesQuery.data?.pagination;
  const isEditing = editingHomeworkTypeId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = homeworkTypes.some((item) => item.id === editingHomeworkTypeId);
    if (!stillExists) {
      setEditingHomeworkTypeId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingHomeworkTypeId, homeworkTypes, isEditing]);

  const resetForm = () => {
    setEditingHomeworkTypeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStartEdit = (item: HomeworkTypeListItem) => {
    if (!canUpdate) {
      return;
    }

    if (item.isSystem) {
      setFormError("هذا نوع واجب نظامي. التعديل عليه محجوب من الواجهة.");
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingHomeworkTypeId(item.id);
    setFormState(toFormState(item));
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(formState.code);
    const name = formState.name.trim();

    if (!code || !name) {
      setFormError("الحقول المطلوبة: الكود والاسم.");
      return false;
    }

    if (code.length > 40 || !/^[A-Z0-9_]+$/.test(code)) {
      setFormError("الكود يجب أن يحتوي أحرفًا كبيرة وأرقامًا وشرطة سفلية (_) فقط، وبحد أقصى 40 حرفًا.");
      return false;
    }

    if (name.length > 120) {
      setFormError("الاسم يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.description.trim().length > 255) {
      setFormError("الوصف يجب ألا يتجاوز 255 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      code: normalizeCode(formState.code),
      name: formState.name.trim(),
      description: toOptionalString(formState.description),
      isSystem: formState.isSystem,
      isActive: formState.isActive,
    };

    if (isEditing && editingHomeworkTypeId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: homework-types.update.");
        return;
      }

      updateMutation.mutate(
        {
          homeworkTypeId: editingHomeworkTypeId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث نوع الواجب بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: homework-types.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء نوع الواجب بنجاح.");
      },
    });
  };

  const handleDelete = (item: HomeworkTypeListItem) => {
    if (!canDelete) {
      return;
    }

    if (item.isSystem) {
      setFormError("لا يمكن حذف نوع واجب نظامي من الواجهة.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف نوع الواجب ${item.code}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingHomeworkTypeId === item.id) {
          resetForm();
        }
        setActionSuccess("تم حذف نوع الواجب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenText className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل نوع واجب" : "إنشاء نوع واجب"}
          </CardTitle>
          <CardDescription>
            {isEditing ? "تحديث نوع الواجب." : "إضافة نوع واجب جديد لنظام التعليم."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>homework-types.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الكود *</label>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="HOMEWORK"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="واجب منزلي"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الوصف</label>
                <Input
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="واجب منزلي قياسي"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>نوع نظامي</span>
                  <input
                    type="checkbox"
                    checked={formState.isSystem}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isSystem: event.target.checked }))
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
              {actionSuccess ? (
                <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                  {actionSuccess}
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
                    <BookOpenText className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء نوع واجب"}
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
            <CardTitle>أنواع الواجبات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة أنواع الواجبات مع حماية الأنواع النظامية.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_150px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم/الكود..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={systemFilter}
              onChange={(event) => {
                setPage(1);
                setSystemFilter(event.target.value as "all" | "system" | "custom");
              }}
            >
              <option value="all">كل الأنواع</option>
              <option value="system">النظامية فقط</option>
              <option value="custom">المخصصة فقط</option>
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
          {homeworkTypesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {homeworkTypesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {homeworkTypesQuery.error instanceof Error
                ? homeworkTypesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!homeworkTypesQuery.isPending && homeworkTypes.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {homeworkTypes.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.name} (<code>{item.code}</code>)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    عدد الواجبات المرتبطة: {item._count.homeworks}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {item.isSystem ? (
                    <Badge variant="outline" className="gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      نظامي
                    </Badge>
                  ) : (
                    <Badge variant="secondary">مخصص</Badge>
                  )}
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
                  disabled={!canUpdate || item.isSystem || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(item)}
                  disabled={!canDelete || item.isSystem || deleteMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || homeworkTypesQuery.isFetching}
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
                  homeworkTypesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void homeworkTypesQuery.refetch()}
                disabled={homeworkTypesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${homeworkTypesQuery.isFetching ? "animate-spin" : ""}`}
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







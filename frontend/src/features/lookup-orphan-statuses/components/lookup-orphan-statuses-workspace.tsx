"use client";

import * as React from "react";
import {
  BadgeCheck,
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
  useCreateLookupOrphanStatusMutation,
  useDeleteLookupOrphanStatusMutation,
  useUpdateLookupOrphanStatusMutation,
} from "@/features/lookup-orphan-statuses/hooks/use-lookup-orphan-statuses-mutations";
import { useLookupOrphanStatusesQuery } from "@/features/lookup-orphan-statuses/hooks/use-lookup-orphan-statuses-query";
import type { LookupOrphanStatusListItem } from "@/lib/api/client";

type LookupOrphanStatusFormState = {
  code: string;
  nameAr: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupOrphanStatusFormState = {
  code: "",
  nameAr: "",
  isActive: true,
};

function toFormState(item: LookupOrphanStatusListItem): LookupOrphanStatusFormState {
  return {
    code: item.code,
    nameAr: item.nameAr,
    isActive: item.isActive,
  };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function LookupOrphanStatusesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("lookup-orphan-statuses.create");
  const canUpdate = hasPermission("lookup-orphan-statuses.update");
  const canDelete = hasPermission("lookup-orphan-statuses.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [editingLookupOrphanStatusId, setEditingLookupOrphanStatusId] = React.useState<number | null>(
    null,
  );
  const [formState, setFormState] = React.useState<LookupOrphanStatusFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookupOrphanStatusesQuery = useLookupOrphanStatusesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateLookupOrphanStatusMutation();
  const updateMutation = useUpdateLookupOrphanStatusMutation();
  const deleteMutation = useDeleteLookupOrphanStatusMutation();

  const lookupOrphanStatuses = React.useMemo(
    () => lookupOrphanStatusesQuery.data?.data ?? [],
    [lookupOrphanStatusesQuery.data?.data],
  );
  const pagination = lookupOrphanStatusesQuery.data?.pagination;
  const isEditing = editingLookupOrphanStatusId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = lookupOrphanStatuses.some((item) => item.id === editingLookupOrphanStatusId);
    if (!stillExists) {
      setEditingLookupOrphanStatusId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingLookupOrphanStatusId, isEditing, lookupOrphanStatuses]);

  const resetForm = () => {
    setEditingLookupOrphanStatusId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(formState.code);
    const nameAr = formState.nameAr.trim();

    if (!code || !nameAr) {
      setFormError("الحقول المطلوبة: الكود والاسم بالعربية.");
      return false;
    }

    if (!/^[A-Z0-9_]+$/.test(code) || code.length > 50) {
      setFormError("الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.");
      return false;
    }

    if (nameAr.length > 100) {
      setFormError("الاسم بالعربية يجب ألا يتجاوز 100 حرف.");
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
      code: normalizeCode(formState.code),
      nameAr: formState.nameAr.trim(),
      isActive: formState.isActive,
    };

    if (isEditing && editingLookupOrphanStatusId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: lookup-orphan-statuses.update.");
        return;
      }

      updateMutation.mutate(
        {
          lookupOrphanStatusId: editingLookupOrphanStatusId,
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
      setFormError("لا تملك الصلاحية المطلوبة: lookup-orphan-statuses.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupOrphanStatusListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingLookupOrphanStatusId(item.id);
    setFormState(toFormState(item));
  };

  const handleDelete = (item: LookupOrphanStatusListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف حالة اليتم ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingLookupOrphanStatusId === item.id) {
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
            <BadgeCheck className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل حالة يتم" : "إنشاء حالة يتم"}
          </CardTitle>
          <CardDescription>
            {isEditing ? "تحديث حالة اليتم." : "إضافة حالة يتم جديدة."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>lookup-orphan-statuses.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="orphan-form">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الكود *</label>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="NONE"
                  required
                  data-testid="orphan-form-code"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم بالعربية *</label>
                <Input
                  value={formState.nameAr}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                  }
                  placeholder="غير يتيم"
                  required
                  data-testid="orphan-form-name-ar"
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
                  data-testid="orphan-form-active"
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
                  data-testid="orphan-form-submit"
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء حالة يتم"}
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
            <CardTitle>حالات اليتم</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة حالات اليتم مع البحث والفلترة.</CardDescription>

          <form onSubmit={handleSearchSubmit} className="grid gap-2 md:grid-cols-[1fr_130px_auto]">
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
          {lookupOrphanStatusesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل حالات اليتم...
            </div>
          ) : null}

          {lookupOrphanStatusesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {lookupOrphanStatusesQuery.error instanceof Error
                ? lookupOrphanStatusesQuery.error.message
                : "فشل تحميل حالات اليتم"}
            </div>
          ) : null}

          {!lookupOrphanStatusesQuery.isPending && lookupOrphanStatuses.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {lookupOrphanStatuses.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="orphan-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.nameAr}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{item.code}</code>
                  </p>
                </div>
                <Badge variant={item.isActive ? "default" : "outline"}>
                  {item.isActive ? "نشط" : "غير نشط"}
                </Badge>
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
                disabled={!pagination || pagination.page <= 1 || lookupOrphanStatusesQuery.isFetching}
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
                  lookupOrphanStatusesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void lookupOrphanStatusesQuery.refetch()}
                disabled={lookupOrphanStatusesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${lookupOrphanStatusesQuery.isFetching ? "animate-spin" : ""}`}
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






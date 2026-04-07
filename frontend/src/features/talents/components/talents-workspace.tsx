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
import {
  useCreateTalentMutation,
  useDeleteTalentMutation,
  useUpdateTalentMutation,
} from "@/features/talents/hooks/use-talents-mutations";
import { useTalentsQuery } from "@/features/talents/hooks/use-talents-query";
import type { TalentListItem } from "@/lib/api/client";

type TalentFormState = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: TalentFormState = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};




function toFormState(talent: TalentListItem): TalentFormState {
  return {
    code: talent.code,
    name: talent.name,
    description: talent.description ?? "",
    isActive: talent.isActive,
  };
}

export function TalentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("talents.create");
  const canUpdate = hasPermission("talents.update");
  const canDelete = hasPermission("talents.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingTalentId, setEditingTalentId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<TalentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const talentsQuery = useTalentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateTalentMutation();
  const updateMutation = useUpdateTalentMutation();
  const deleteMutation = useDeleteTalentMutation();

  const talents = React.useMemo(() => talentsQuery.data?.data ?? [], [talentsQuery.data?.data]);
  const pagination = talentsQuery.data?.pagination;
  const isEditing = editingTalentId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = talents.some((talent) => talent.id === editingTalentId);
    if (!stillExists) {
      setEditingTalentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingTalentId, isEditing, talents]);

  const resetForm = () => {
    setEditingTalentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!name) {
      setFormError("الاسم مطلوب.");
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

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingTalentId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: talents.update.");
        return;
      }

      updateMutation.mutate(
        {
          talentId: editingTalentId,
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
      setFormError("لا تملك الصلاحية المطلوبة: talents.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (talent: TalentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingTalentId(talent.id);
    setFormState(toFormState(talent));
  };

  const handleDelete = (talent: TalentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الموهبة ${talent.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(talent.id, {
      onSuccess: () => {
        if (editingTalentId === talent.id) {
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
            <Sparkles className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل موهبة" : "إنشاء موهبة"}
          </CardTitle>
          <CardDescription>
            {isEditing ? "تحديث بيانات الموهبة." : "إضافة موهبة جديدة للموظفين."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>talents.create</code>.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={handleSubmitForm}
              data-testid="talent-catalog-form"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="تحسين الخط"
                  required
                  data-testid="talent-catalog-form-name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الوصف</label>
                <Input
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="وصف اختياري"
                  data-testid="talent-catalog-form-description"
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
                  data-testid="talent-catalog-form-active"
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
                  data-testid="talent-catalog-form-submit"
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء موهبة"}
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
            <CardTitle>قائمة المواهب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة المواهب مع الفلترة حسب الحالة.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_140px_auto]"
            data-testid="talent-catalog-filters-form"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم..."
                className="pr-8"
                data-testid="talent-catalog-filter-search"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
              data-testid="talent-catalog-filter-active"
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </select>

            <Button
              type="submit"
              variant="outline"
              className="gap-2"
              data-testid="talent-catalog-filters-submit"
            >
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {talentsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {talentsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {talentsQuery.error instanceof Error
                ? talentsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!talentsQuery.isPending && talents.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد مواهب مطابقة.
            </div>
          ) : null}

          {talents.map((talent) => (
            <div
              key={talent.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="talent-catalog-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{talent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{talent.code}</code>
                  </p>
                  {talent.description ? (
                    <p className="text-xs text-muted-foreground">{talent.description}</p>
                  ) : null}
                </div>
                <Badge variant={talent.isActive ? "default" : "outline"}>
                  {talent.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(talent)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(talent)}
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
                disabled={!pagination || pagination.page <= 1 || talentsQuery.isFetching}
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
                  !pagination || pagination.page >= pagination.totalPages || talentsQuery.isFetching
                }
              >
                التالي
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void talentsQuery.refetch()}
                disabled={talentsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${talentsQuery.isFetching ? "animate-spin" : ""}`}
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






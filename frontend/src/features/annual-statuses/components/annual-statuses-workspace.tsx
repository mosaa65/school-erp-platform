"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
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
  useCreateAnnualStatusMutation,
  useDeleteAnnualStatusMutation,
  useUpdateAnnualStatusMutation,
} from "@/features/annual-statuses/hooks/use-annual-statuses-mutations";
import { useAnnualStatusesQuery } from "@/features/annual-statuses/hooks/use-annual-statuses-query";
import type { AnnualStatusListItem } from "@/lib/api/client";

type FormState = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  code: "",
  name: "",
  description: "",
  isSystem: false,
  isActive: true,
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: AnnualStatusListItem): FormState {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    isSystem: item.isSystem,
    isActive: item.isActive,
  };
}

export function AnnualStatusesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("annual-statuses.create");
  const canUpdate = hasPermission("annual-statuses.update");
  const canDelete = hasPermission("annual-statuses.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [systemFilter, setSystemFilter] = React.useState<"all" | "system" | "custom">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const annualStatusesQuery = useAnnualStatusesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isSystem: systemFilter === "all" ? undefined : systemFilter === "system",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateAnnualStatusMutation();
  const updateMutation = useUpdateAnnualStatusMutation();
  const deleteMutation = useDeleteAnnualStatusMutation();

  const records = React.useMemo(() => annualStatusesQuery.data?.data ?? [], [annualStatusesQuery.data?.data]);
  const pagination = annualStatusesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const resetForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(form.code);
    const name = form.name.trim();
    const description = form.description.trim();
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
    if (description.length > 255) {
      setFormError("الوصف يجب ألا يتجاوز 255 حرفًا.");
      return false;
    }
    setFormError(null);
    return true;
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل حالة سنوية" : "إنشاء حالة سنوية"}
          </CardTitle>
          <CardDescription>إدارة حالات النجاح/الرسوب السنوية للمواد.</CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>annual-statuses.create</code>.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!validateForm()) {
                  return;
                }
                const payload = {
                  code: normalizeCode(form.code),
                  name: form.name.trim(),
                  description: toOptionalString(form.description),
                  isSystem: form.isSystem,
                  isActive: form.isActive,
                };

                if (isEditing && editingId) {
                  if (!canUpdate) {
                    setFormError("لا تملك الصلاحية المطلوبة: annual-statuses.update.");
                    return;
                  }
                  updateMutation.mutate(
                    {
                      annualStatusId: editingId,
                      payload,
                    },
                    {
                      onSuccess: () => resetForm(),
                    },
                  );
                  return;
                }

                createMutation.mutate(payload, {
                  onSuccess: () => {
                    resetForm();
                    setPage(1);
                  },
                });
              }}
            >
              <Input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="الكود *"
                required
              />
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="الاسم *"
                required
              />
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="الوصف"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>نظامي</span>
                  <input
                    type="checkbox"
                    checked={form.isSystem}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isSystem: event.target.checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>نشط</span>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isActive: event.target.checked }))
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
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء حالة سنوية"}
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

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الحالات السنوية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="grid gap-2 md:grid-cols-[1fr_150px_130px_auto]"
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
              value={systemFilter}
              onChange={(event) => {
                setPage(1);
                setSystemFilter(event.target.value as "all" | "system" | "custom");
              }}
            >
              <option value="all">الكل</option>
              <option value="system">نظامي</option>
              <option value="custom">مخصص</option>
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
          {annualStatusesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}
          {annualStatusesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {annualStatusesQuery.error instanceof Error
                ? annualStatusesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}
          {!annualStatusesQuery.isPending && records.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج.
            </div>
          ) : null}

          {records.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.name} (<code>{item.code}</code>)
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">
                    عدد الدرجات السنوية المرتبطة: {item._count.annualGrades}
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
                  onClick={() => {
                    if (!canUpdate || item.isSystem) {
                      return;
                    }
                    setEditingId(item.id);
                    setForm(toFormState(item));
                    setFormError(null);
                  }}
                  disabled={!canUpdate || item.isSystem || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (!canDelete || item.isSystem) {
                      return;
                    }
                    if (!window.confirm(`تأكيد حذف الحالة ${item.code}؟`)) {
                      return;
                    }
                    deleteMutation.mutate(item.id);
                  }}
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
                disabled={!pagination || pagination.page <= 1 || annualStatusesQuery.isFetching}
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
                  annualStatusesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void annualStatusesQuery.refetch()}
                disabled={annualStatusesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${annualStatusesQuery.isFetching ? "animate-spin" : ""}`}
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









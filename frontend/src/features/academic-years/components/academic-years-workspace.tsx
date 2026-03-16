"use client";

import * as React from "react";
import {
  CalendarDays,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Star,
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
  useCreateAcademicYearMutation,
  useDeleteAcademicYearMutation,
  useUpdateAcademicYearMutation,
} from "@/features/academic-years/hooks/use-academic-years-mutations";
import { useAcademicYearsQuery } from "@/features/academic-years/hooks/use-academic-years-query";
import type { AcademicYearListItem, AcademicYearStatus } from "@/lib/api/client";

type AcademicYearFormState = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  isCurrent: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: AcademicYearFormState = {
  code: "",
  name: "",
  startDate: "",
  endDate: "",
  status: "PLANNED",
  isCurrent: false,
};

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function toUtcEndIso(dateInput: string): string {
  return `${dateInput}T23:59:59.999Z`;
}

function toFormState(year: AcademicYearListItem): AcademicYearFormState {
  return {
    code: year.code,
    name: year.name,
    startDate: formatDateInput(year.startDate),
    endDate: formatDateInput(year.endDate),
    status: year.status,
    isCurrent: year.isCurrent,
  };
}

function statusBadgeVariant(status: AcademicYearStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "PLANNED":
      return "secondary";
    default:
      return "outline";
  }
}

function statusLabel(status: AcademicYearStatus): string {
  switch (status) {
    case "PLANNED":
      return "مخططة";
    case "ACTIVE":
      return "نشطة";
    case "CLOSED":
      return "مغلقة";
    case "ARCHIVED":
      return "مؤرشفة";
    default:
      return status;
  }
}

export function AcademicYearsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("academic-years.create");
  const canUpdate = hasPermission("academic-years.update");
  const canDelete = hasPermission("academic-years.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AcademicYearStatus | "all">("all");
  const [currentFilter, setCurrentFilter] = React.useState<"all" | "current" | "not-current">(
    "all",
  );

  const [editingYearId, setEditingYearId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<AcademicYearFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const yearsQuery = useAcademicYearsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    isCurrent:
      currentFilter === "all" ? undefined : currentFilter === "current" ? true : false,
  });

  const createMutation = useCreateAcademicYearMutation();
  const updateMutation = useUpdateAcademicYearMutation();
  const deleteMutation = useDeleteAcademicYearMutation();

  const years = React.useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data?.data]);
  const pagination = yearsQuery.data?.pagination;
  const isEditing = editingYearId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = years.some((year) => year.id === editingYearId);
    if (!stillExists) {
      setEditingYearId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingYearId, isEditing, years]);

  const resetForm = () => {
    setEditingYearId(null);
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
    const name = formState.name.trim();

    if (!code || !name || !formState.startDate || !formState.endDate) {
      setFormError("جميع الحقول الأساسية مطلوبة.");
      return false;
    }

    if (!/^[a-z0-9_.:-]+$/.test(code)) {
      setFormError("صيغة الكود غير صحيحة.");
      return false;
    }

    const start = new Date(toUtcStartIso(formState.startDate));
    const end = new Date(toUtcEndIso(formState.endDate));

    if (start >= end) {
      setFormError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return false;
    }

    if (formState.isCurrent && formState.status !== "ACTIVE") {
      setFormError("السنة الحالية يجب أن تكون بحالة نشطة.");
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
      name: formState.name.trim(),
      startDate: toUtcStartIso(formState.startDate),
      endDate: toUtcEndIso(formState.endDate),
      status: formState.status,
      isCurrent: formState.isCurrent,
    };

    if (isEditing && editingYearId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: academic-years.update.");
        return;
      }

      updateMutation.mutate(
        {
          academicYearId: editingYearId,
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
      setFormError("لا تملك الصلاحية المطلوبة: academic-years.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (year: AcademicYearListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingYearId(year.id);
    setFormState(toFormState(year));
  };

  const handleDelete = (year: AcademicYearListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف السنة الأكاديمية ${year.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(year.id, {
      onSuccess: () => {
        if (editingYearId === year.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل سنة أكاديمية" : "إنشاء سنة أكاديمية"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل البيانات الزمنية والحالة للسنة الأكاديمية."
              : "إضافة سنة أكاديمية جديدة (النظام 02 - النواة الأكاديمية)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>academic-years.create</code>.
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
                  placeholder="ay-2026-2027"
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
                  placeholder="العام الأكاديمي 2026/2027"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ البداية *
                  </label>
                  <Input
                    type="date"
                    value={formState.startDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ النهاية *</label>
                  <Input
                    type="date"
                    value={formState.endDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الحالة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as AcademicYearStatus,
                    }))
                  }
                >
                  <option value="PLANNED">مخططة</option>
                  <option value="ACTIVE">نشطة</option>
                  <option value="CLOSED">مغلقة</option>
                  <option value="ARCHIVED">مؤرشفة</option>
                </select>
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>السنة الأكاديمية الحالية</span>
                <input
                  type="checkbox"
                  checked={formState.isCurrent}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isCurrent: event.target.checked }))
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
                    <CalendarDays className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء سنة أكاديمية"}
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
            <CardTitle>قائمة السنوات الأكاديمية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة السنوات الأكاديمية مع فلترة بالبحث والحالة وكونها الحالية.
          </CardDescription>

          <form onSubmit={handleSearchSubmit} className="grid gap-2 md:grid-cols-[1fr_180px_160px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم أو الكود..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as AcademicYearStatus | "all");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="PLANNED">مخططة</option>
              <option value="ACTIVE">نشطة</option>
              <option value="CLOSED">مغلقة</option>
              <option value="ARCHIVED">مؤرشفة</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={currentFilter}
              onChange={(event) => {
                setPage(1);
                setCurrentFilter(event.target.value as "all" | "current" | "not-current");
              }}
            >
              <option value="all">كل حالات الحالية</option>
              <option value="current">الحالية فقط</option>
              <option value="not-current">غير الحالية فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {yearsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {yearsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {yearsQuery.error instanceof Error
                ? yearsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!yearsQuery.isPending && years.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سنوات مطابقة.
            </div>
          ) : null}

          {years.map((year) => (
            <div
              key={year.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{year.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{year.code}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(year.startDate).toLocaleDateString()} -{" "}
                    {new Date(year.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusBadgeVariant(year.status)}>{statusLabel(year.status)}</Badge>
                  {year.isCurrent ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Star className="h-3.5 w-3.5" />
                      الحالية
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(year)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(year)}
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
                disabled={!pagination || pagination.page <= 1 || yearsQuery.isFetching}
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
                  yearsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void yearsQuery.refetch()}
                disabled={yearsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${yearsQuery.isFetching ? "animate-spin" : ""}`}
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






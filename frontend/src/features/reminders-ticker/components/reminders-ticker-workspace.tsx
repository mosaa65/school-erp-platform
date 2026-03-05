"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  ScrollText,
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
  useCreateReminderTickerMutation,
  useDeleteReminderTickerMutation,
  useUpdateReminderTickerMutation,
} from "@/features/reminders-ticker/hooks/use-reminders-ticker-mutations";
import { useRemindersTickerQuery } from "@/features/reminders-ticker/hooks/use-reminders-ticker-query";
import type { ReminderTickerListItem, ReminderTickerType } from "@/lib/api/client";

type ReminderTickerFormState = {
  content: string;
  tickerType: ReminderTickerType;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
};

const PAGE_SIZE = 12;
const TICKER_TYPE_OPTIONS: Array<{ value: ReminderTickerType; label: string }> = [
  { value: "DHIKR", label: "ذكر" },
  { value: "ALERT", label: "تنبيه" },
  { value: "ANNOUNCEMENT", label: "إعلان" },
  { value: "VERSE", label: "آية" },
  { value: "HADITH", label: "حديث" },
];

const DEFAULT_FORM_STATE: ReminderTickerFormState = {
  content: "",
  tickerType: "DHIKR",
  isActive: true,
  displayOrder: 0,
  startDate: "",
  endDate: "",
};

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function toFormState(item: ReminderTickerListItem): ReminderTickerFormState {
  return {
    content: item.content,
    tickerType: item.tickerType,
    isActive: item.isActive,
    displayOrder: item.displayOrder,
    startDate: toDateInputValue(item.startDate),
    endDate: toDateInputValue(item.endDate),
  };
}

function getTickerTypeLabel(tickerType: ReminderTickerType): string {
  return TICKER_TYPE_OPTIONS.find((option) => option.value === tickerType)?.label ?? tickerType;
}

function ensureDateRange(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) {
    return null;
  }

  if (new Date(endDate) < new Date(startDate)) {
    return "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.";
  }

  return null;
}

export function RemindersTickerWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("reminders-ticker.create");
  const canUpdate = hasPermission("reminders-ticker.update");
  const canDelete = hasPermission("reminders-ticker.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [typeFilter, setTypeFilter] = React.useState<ReminderTickerType | "all">("all");

  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [formState, setFormState] = React.useState<ReminderTickerFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const remindersTickerQuery = useRemindersTickerQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    tickerType: typeFilter === "all" ? undefined : typeFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateReminderTickerMutation();
  const updateMutation = useUpdateReminderTickerMutation();
  const deleteMutation = useDeleteReminderTickerMutation();

  const reminders = React.useMemo(
    () => remindersTickerQuery.data?.data ?? [],
    [remindersTickerQuery.data?.data],
  );
  const pagination = remindersTickerQuery.data?.pagination;
  const isEditing = editingItemId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = reminders.some((item) => item.id === editingItemId);
    if (!stillExists) {
      setEditingItemId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingItemId, isEditing, reminders]);

  const resetForm = () => {
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStartEdit = (item: ReminderTickerListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingItemId(item.id);
    setFormState(toFormState(item));
    setFormError(null);
  };

  const validateForm = (): boolean => {
    const content = formState.content.trim();
    if (!content) {
      setFormError("المحتوى إلزامي.");
      return false;
    }

    const dateRangeError = ensureDateRange(formState.startDate, formState.endDate);
    if (dateRangeError) {
      setFormError(dateRangeError);
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
      content: formState.content.trim(),
      tickerType: formState.tickerType,
      isActive: formState.isActive,
      displayOrder: formState.displayOrder,
      startDate: formState.startDate || undefined,
      endDate: formState.endDate || undefined,
    };

    if (isEditing && editingItemId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية reminders-ticker.update.");
        return;
      }

      updateMutation.mutate(
        {
          reminderTickerId: editingItemId,
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
      setFormError("لا تملك صلاحية reminders-ticker.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleDelete = (item: ReminderTickerListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm("تأكيد حذف عنصر التذكير؟");
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingItemId === item.id) {
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
            <ScrollText className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل تذكير" : "إضافة تذكير"}
          </CardTitle>
          <CardDescription>
            إدارة محتوى الشريط المتحرك (أذكار، تنبيهات، إعلانات).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>reminders-ticker.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="reminder-form">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">المحتوى *</label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-background p-3 text-sm"
                  value={formState.content}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, content: event.target.value }))
                  }
                  placeholder="اكتب نص التذكير أو الإعلان..."
                  required
                  data-testid="reminder-form-content"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">النوع</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.tickerType}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        tickerType: event.target.value as ReminderTickerType,
                      }))
                    }
                    data-testid="reminder-form-type"
                  >
                    {TICKER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ترتيب العرض</label>
                  <Input
                    type="number"
                    min={0}
                    value={formState.displayOrder}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        displayOrder: Number(event.target.value || "0"),
                      }))
                    }
                    data-testid="reminder-form-order"
                  />
                </div>
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
                    data-testid="reminder-form-start-date"
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
                    data-testid="reminder-form-end-date"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشط</span>
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                  data-testid="reminder-form-active"
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
                  data-testid="reminder-form-submit"
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScrollText className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إضافة عنصر"}
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
            <CardTitle>عناصر الشريط المتحرك</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>بحث وفلترة وإدارة العناصر المعروضة في الواجهة.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_140px_130px_auto]"
            data-testid="reminder-filters-form"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث في المحتوى..."
                className="pr-8"
                data-testid="reminder-filter-search"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value as ReminderTickerType | "all");
              }}
              data-testid="reminder-filter-type"
            >
              <option value="all">كل الأنواع</option>
              {TICKER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
              data-testid="reminder-filter-active"
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
          {remindersTickerQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل العناصر...
            </div>
          ) : null}

          {remindersTickerQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {remindersTickerQuery.error instanceof Error
                ? remindersTickerQuery.error.message
                : "فشل تحميل العناصر"}
            </div>
          ) : null}

          {!remindersTickerQuery.isPending && reminders.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {reminders.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="reminder-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="whitespace-pre-wrap text-sm">{item.content}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{getTickerTypeLabel(item.tickerType)}</Badge>
                    <Badge variant="secondary">الترتيب: {item.displayOrder}</Badge>
                    <Badge variant={item.isActive ? "default" : "outline"}>
                      {item.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                  {(item.startDate || item.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {item.startDate ? `من ${item.startDate.slice(0, 10)}` : "بدون تاريخ بداية"}
                      {" - "}
                      {item.endDate ? `إلى ${item.endDate.slice(0, 10)}` : "بدون تاريخ نهاية"}
                    </p>
                  )}
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
                disabled={!pagination || pagination.page <= 1 || remindersTickerQuery.isFetching}
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
                  remindersTickerQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void remindersTickerQuery.refetch()}
                disabled={remindersTickerQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${remindersTickerQuery.isFetching ? "animate-spin" : ""}`}
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

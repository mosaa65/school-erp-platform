"use client";

import * as React from "react";
import { Gift, RefreshCw, Users } from "lucide-react";
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
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SelectField } from "@/components/ui/select-field";
import { useCommunityContributionsQuery } from "@/features/community-contributions/hooks/use-community-contributions-query";

const PAGE_SIZE = 12;

type DraftFilters = {
  search: string;
  enrollmentId: string;
  academicYearId: string;
  semesterId: string;
  monthId: string;
  requiredAmountId: string;
  recipientEmployeeId: string;
  exemption: "all" | "exempt" | "paid";
  dateFrom: string;
  dateTo: string;
};

type AppliedFilters = {
  search?: string;
  enrollmentId?: string;
  academicYearId?: string;
  semesterId?: string;
  monthId?: string;
  requiredAmountId?: number;
  recipientEmployeeId?: string;
  isExempt?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

const DEFAULT_FILTERS: DraftFilters = {
  search: "",
  enrollmentId: "",
  academicYearId: "",
  semesterId: "",
  monthId: "",
  requiredAmountId: "",
  recipientEmployeeId: "",
  exemption: "all",
  dateFrom: "",
  dateTo: "",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function CommunityContributionsWorkspace() {
  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const contributionsQuery = useCommunityContributionsQuery({
    page,
    limit: PAGE_SIZE,
    search: appliedFilters.search,
    enrollmentId: appliedFilters.enrollmentId,
    academicYearId: appliedFilters.academicYearId,
    semesterId: appliedFilters.semesterId,
    monthId: appliedFilters.monthId,
    requiredAmountId: appliedFilters.requiredAmountId,
    recipientEmployeeId: appliedFilters.recipientEmployeeId,
    isExempt: appliedFilters.isExempt,
    dateFrom: appliedFilters.dateFrom,
    dateTo: appliedFilters.dateTo,
  });

  const contributions = React.useMemo(
    () => contributionsQuery.data?.data ?? [],
    [contributionsQuery.data?.data],
  );
  const pagination = contributionsQuery.data?.pagination;

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.search ? 1 : 0,
      appliedFilters.enrollmentId ? 1 : 0,
      appliedFilters.academicYearId ? 1 : 0,
      appliedFilters.semesterId ? 1 : 0,
      appliedFilters.monthId ? 1 : 0,
      appliedFilters.requiredAmountId ? 1 : 0,
      appliedFilters.recipientEmployeeId ? 1 : 0,
      appliedFilters.isExempt !== undefined ? 1 : 0,
      appliedFilters.dateFrom ? 1 : 0,
      appliedFilters.dateTo ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: toOptionalString(draftFilters.search),
      enrollmentId: toOptionalString(draftFilters.enrollmentId),
      academicYearId: toOptionalString(draftFilters.academicYearId),
      semesterId: toOptionalString(draftFilters.semesterId),
      monthId: toOptionalString(draftFilters.monthId),
      requiredAmountId: toOptionalNumber(draftFilters.requiredAmountId),
      recipientEmployeeId: toOptionalString(draftFilters.recipientEmployeeId),
      isExempt:
        draftFilters.exemption === "all"
          ? undefined
          : draftFilters.exemption === "exempt",
      dateFrom: toOptionalString(draftFilters.dateFrom),
      dateTo: toOptionalString(draftFilters.dateTo),
    });
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters({});
    setPage(1);
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTriggerButton
          count={activeFiltersCount}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلترة المساهمات"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="flex-1 gap-1.5"
            >
              مسح
            </Button>
            <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="بحث بالاسم أو الملاحظة"
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
          <Input
            placeholder="معرف القيد الدراسي"
            value={draftFilters.enrollmentId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, enrollmentId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف العام الدراسي"
            value={draftFilters.academicYearId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, academicYearId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف الفصل الدراسي"
            value={draftFilters.semesterId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, semesterId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف الشهر"
            value={draftFilters.monthId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, monthId: event.target.value }))
            }
          />
          <Input
            type="number"
            placeholder="معرف مبلغ الإلزام"
            value={draftFilters.requiredAmountId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, requiredAmountId: event.target.value }))
            }
          />
          <Input
            placeholder="معرف الموظف المستلم"
            value={draftFilters.recipientEmployeeId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, recipientEmployeeId: event.target.value }))
            }
          />
          <SelectField
            value={draftFilters.exemption}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                exemption: event.target.value as DraftFilters["exemption"],
              }))
            }
          >
            <option value="all">كل الحالات</option>
            <option value="paid">مدفوع</option>
            <option value="exempt">معفى</option>
          </SelectField>
          <Input
            type="date"
            value={draftFilters.dateFrom}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.dateTo}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
            }
          />
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              المساهمات المجتمعية
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            متابعة مبالغ المساهمة المجتمعية والحالات المستثناة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {contributionsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل المساهمات...
            </div>
          ) : null}

          {contributionsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {contributionsQuery.error instanceof Error
                ? contributionsQuery.error.message
                : "تعذر تحميل المساهمات."}
            </div>
          ) : null}

          {!contributionsQuery.isPending && contributions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد مساهمات مطابقة.
            </div>
          ) : null}

          {contributions.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.payerName ?? "ولي أمر/متبرع"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : "-"}
                  </p>
                </div>
                <Badge variant={item.isExempt ? "outline" : "default"}>
                  {item.isExempt ? "معفى" : "مدفوع"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">{item.receivedAmount ?? 0}</span>
                {item.requiredAmount?.nameAr ? (
                  <span className="text-xs text-muted-foreground">
                    الفئة: {item.requiredAmount.nameAr}
                  </span>
                ) : null}
              </div>

              {item.notes ? (
                <p className="text-xs text-muted-foreground">{item.notes}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  القيد: {item.enrollmentId ?? "-"}
                </span>
                {item.receiptNumber ? <span>سند: {item.receiptNumber}</span> : null}
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
                disabled={!pagination || pagination.page <= 1 || contributionsQuery.isFetching}
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
                disabled={!pagination || pagination.page >= pagination.totalPages || contributionsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void contributionsQuery.refetch()}
                disabled={contributionsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${contributionsQuery.isFetching ? "animate-spin" : ""}`}
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

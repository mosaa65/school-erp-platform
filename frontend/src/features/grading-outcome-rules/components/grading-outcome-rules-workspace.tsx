"use client";

import * as React from "react";
import {
  LoaderCircle,
  Medal,
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
import { useAcademicYearOptionsQuery } from "@/features/annual-grades/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/annual-results/hooks/use-grade-level-options-query";
import { usePromotionDecisionOptionsQuery } from "@/features/annual-results/hooks/use-promotion-decision-options-query";
import {
  useCreateGradingOutcomeRuleMutation,
  useDeleteGradingOutcomeRuleMutation,
  useUpdateGradingOutcomeRuleMutation,
} from "@/features/grading-outcome-rules/hooks/use-grading-outcome-rules-mutations";
import { useGradingOutcomeRulesQuery } from "@/features/grading-outcome-rules/hooks/use-grading-outcome-rules-query";
import { translateTieBreakStrategy } from "@/lib/i18n/ar";
import type { GradingOutcomeRuleListItem, TieBreakStrategy } from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

type FormState = {
  academicYearId: string;
  gradeLevelId: string;
  promotedMaxFailedSubjects: string;
  conditionalMaxFailedSubjects: string;
  conditionalDecisionId: string;
  retainedDecisionId: string;
  tieBreakStrategy: TieBreakStrategy;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  gradeLevelId: "",
  promotedMaxFailedSubjects: "0",
  conditionalMaxFailedSubjects: "2",
  conditionalDecisionId: "",
  retainedDecisionId: "",
  tieBreakStrategy: "PERCENTAGE_THEN_NAME",
  isActive: true,
};

function parseIntValue(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toFormState(item: GradingOutcomeRuleListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId,
    promotedMaxFailedSubjects: String(item.promotedMaxFailedSubjects),
    conditionalMaxFailedSubjects: String(item.conditionalMaxFailedSubjects),
    conditionalDecisionId: item.conditionalDecisionId,
    retainedDecisionId: item.retainedDecisionId,
    tieBreakStrategy: item.tieBreakStrategy,
    isActive: item.isActive,
  };
}

export function GradingOutcomeRulesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grading-outcome-rules.create");
  const canUpdate = hasPermission("grading-outcome-rules.update");
  const canDelete = hasPermission("grading-outcome-rules.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gradeFilter, setGradeFilter] = React.useState("all");
  const [strategyFilter, setStrategyFilter] = React.useState<"all" | TieBreakStrategy>("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const yearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const promotionDecisionsQuery = usePromotionDecisionOptionsQuery();

  const rulesQuery = useGradingOutcomeRulesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
    tieBreakStrategy: strategyFilter === "all" ? undefined : strategyFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateGradingOutcomeRuleMutation();
  const updateMutation = useUpdateGradingOutcomeRuleMutation();
  const deleteMutation = useDeleteGradingOutcomeRuleMutation();

  const records = React.useMemo(() => rulesQuery.data?.data ?? [], [rulesQuery.data?.data]);
  const pagination = rulesQuery.data?.pagination;
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
    if (
      !form.academicYearId ||
      !form.gradeLevelId ||
      !form.conditionalDecisionId ||
      !form.retainedDecisionId
    ) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }
    const promoted = parseIntValue(form.promotedMaxFailedSubjects);
    const conditional = parseIntValue(form.conditionalMaxFailedSubjects);
    if (promoted === undefined || conditional === undefined) {
      setFormError("قيم الرسوب يجب أن تكون أرقامًا صحيحة.");
      return false;
    }
    if (promoted < 0 || conditional < 0 || promoted > 20 || conditional > 20) {
      setFormError("قيم الرسوب يجب أن تكون بين 0 و 20.");
      return false;
    }
    if (conditional < promoted) {
      setFormError("القيمة الشرطية يجب أن تكون >= قيمة الترفيع.");
      return false;
    }
    setFormError(null);
    return true;
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل قاعدة نتائج" : "إنشاء قاعدة نتائج"}
          </CardTitle>
          <CardDescription>
            قواعد تحديد القرار النهائي والترتيب عند التساوي.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>grading-outcome-rules.create</code>.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setActionSuccess(null);
                if (!validateForm()) {
                  return;
                }
                const promoted = parseIntValue(form.promotedMaxFailedSubjects) ?? 0;
                const conditional = parseIntValue(form.conditionalMaxFailedSubjects) ?? 0;

                const payload = {
                  academicYearId: form.academicYearId,
                  gradeLevelId: form.gradeLevelId,
                  promotedMaxFailedSubjects: promoted,
                  conditionalMaxFailedSubjects: conditional,
                  conditionalDecisionId: form.conditionalDecisionId,
                  retainedDecisionId: form.retainedDecisionId,
                  tieBreakStrategy: form.tieBreakStrategy,
                  isActive: form.isActive,
                };

                if (isEditing && editingId) {
                  if (!canUpdate) {
                    setFormError("لا تملك الصلاحية المطلوبة: grading-outcome-rules.update.");
                    return;
                  }
                  updateMutation.mutate(
                    { gradingOutcomeRuleId: editingId, payload },
                    {
                      onSuccess: () => {
                        resetForm();
                        setActionSuccess("تم تحديث قاعدة المخرجات بنجاح.");
                      },
                    },
                  );
                  return;
                }

                createMutation.mutate(payload, {
                  onSuccess: () => {
                    resetForm();
                    setPage(1);
                    setActionSuccess("تم إنشاء قاعدة المخرجات بنجاح.");
                  },
                });
              }}
            >
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.academicYearId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
              >
                <option value="">السنة الأكاديمية *</option>
                {(yearsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.gradeLevelId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, gradeLevelId: event.target.value }))
                }
              >
                <option value="">الصف الدراسي *</option>
                {(gradeLevelsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={form.promotedMaxFailedSubjects}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      promotedMaxFailedSubjects: event.target.value,
                    }))
                  }
                  placeholder="الحد الأقصى للترفيع (مواد راسبة) *"
                />
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={form.conditionalMaxFailedSubjects}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      conditionalMaxFailedSubjects: event.target.value,
                    }))
                  }
                  placeholder="الحد الأقصى للقرار الشرطي (مواد راسبة) *"
                />
              </div>

              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.conditionalDecisionId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, conditionalDecisionId: event.target.value }))
                }
              >
                <option value="">قرار الشرطي *</option>
                {(promotionDecisionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.retainedDecisionId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, retainedDecisionId: event.target.value }))
                }
              >
                <option value="">قرار الإبقاء *</option>
                {(promotionDecisionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.tieBreakStrategy}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tieBreakStrategy: event.target.value as TieBreakStrategy,
                  }))
                }
              >
                <option value="PERCENTAGE_ONLY">
                  {translateTieBreakStrategy("PERCENTAGE_ONLY")}
                </option>
                <option value="PERCENTAGE_THEN_TOTAL">
                  {translateTieBreakStrategy("PERCENTAGE_THEN_TOTAL")}
                </option>
                <option value="PERCENTAGE_THEN_NAME">
                  {translateTieBreakStrategy("PERCENTAGE_THEN_NAME")}
                </option>
              </select>
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
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Medal className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء قاعدة"}
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
            <CardTitle>قواعد مخرجات الدرجات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="grid gap-2 md:grid-cols-[1fr_140px_140px_200px_110px_auto]"
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
              value={yearFilter}
              onChange={(event) => {
                setPage(1);
                setYearFilter(event.target.value);
              }}
            >
              <option value="all">كل السنوات</option>
              {(yearsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={gradeFilter}
              onChange={(event) => {
                setPage(1);
                setGradeFilter(event.target.value);
              }}
            >
              <option value="all">كل الصفوف</option>
              {(gradeLevelsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={strategyFilter}
              onChange={(event) => {
                setPage(1);
                setStrategyFilter(event.target.value as "all" | TieBreakStrategy);
              }}
            >
              <option value="all">كل الاستراتيجيات</option>
              <option value="PERCENTAGE_ONLY">
                {translateTieBreakStrategy("PERCENTAGE_ONLY")}
              </option>
              <option value="PERCENTAGE_THEN_TOTAL">
                {translateTieBreakStrategy("PERCENTAGE_THEN_TOTAL")}
              </option>
              <option value="PERCENTAGE_THEN_NAME">
                {translateTieBreakStrategy("PERCENTAGE_THEN_NAME")}
              </option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">الكل</option>
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
          {rulesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}
          {rulesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {rulesQuery.error instanceof Error
                ? rulesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}
          {!rulesQuery.isPending && records.length === 0 ? (
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
                    {formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} - {formatNameCodeLabel(item.gradeLevel.name, item.gradeLevel.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    حد الترفيع: {item.promotedMaxFailedSubjects} | حد الشرطي:{" "}
                    {item.conditionalMaxFailedSubjects}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    قرار الشرطي: {formatNameCodeLabel(item.conditionalDecision.name, item.conditionalDecision.code)} | قرار الإبقاء:{" "}
                    {formatNameCodeLabel(item.retainedDecision.name, item.retainedDecision.code)} | فك التساوي:{" "}
                    {translateTieBreakStrategy(item.tieBreakStrategy)}
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
                  onClick={() => {
                    if (!canUpdate) {
                      return;
                    }
                    setEditingId(item.id);
                    setForm(toFormState(item));
                    setFormError(null);
                    setActionSuccess(null);
                  }}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (!canDelete) {
                      return;
                    }
                    if (!window.confirm("تأكيد الحذف؟")) {
                      return;
                    }
                    deleteMutation.mutate(item.id, {
                      onSuccess: () => {
                        setActionSuccess("تم حذف قاعدة المخرجات بنجاح.");
                      },
                    });
                  }}
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
                disabled={!pagination || pagination.page <= 1 || rulesQuery.isFetching}
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
                  !pagination || pagination.page >= pagination.totalPages || rulesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void rulesQuery.refetch()}
                disabled={rulesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${rulesQuery.isFetching ? "animate-spin" : ""}`}
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






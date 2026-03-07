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
import { useAcademicMonthOptionsQuery } from "@/features/monthly-grades/hooks/use-academic-month-options-query";
import { useSectionOptionsQuery } from "@/features/monthly-grades/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/monthly-grades/hooks/use-subject-options-query";
import {
  useCreateMonthlyCustomComponentScoreMutation,
  useDeleteMonthlyCustomComponentScoreMutation,
  useUpdateMonthlyCustomComponentScoreMutation,
} from "@/features/monthly-custom-component-scores/hooks/use-monthly-custom-component-scores-mutations";
import { useGradingPolicyComponentOptionsQuery } from "@/features/monthly-custom-component-scores/hooks/use-grading-policy-component-options-query";
import { useMonthlyCustomComponentScoresQuery } from "@/features/monthly-custom-component-scores/hooks/use-monthly-custom-component-scores-query";
import { useMonthlyGradeOptionsQuery } from "@/features/monthly-custom-component-scores/hooks/use-monthly-grade-options-query";
import type { MonthlyCustomComponentScoreListItem } from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";

type FormState = {
  monthlyGradeId: string;
  gradingPolicyComponentId: string;
  score: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  monthlyGradeId: "",
  gradingPolicyComponentId: "",
  score: "0",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseScore(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toFormState(item: MonthlyCustomComponentScoreListItem): FormState {
  return {
    monthlyGradeId: item.monthlyGradeId,
    gradingPolicyComponentId: item.gradingPolicyComponentId,
    score: String(item.score),
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function MonthlyCustomComponentScoresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("monthly-custom-component-scores.create");
  const canUpdate = hasPermission("monthly-custom-component-scores.update");
  const canDelete = hasPermission("monthly-custom-component-scores.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<MonthlyCustomComponentScoreListItem | null>(
    null,
  );
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const monthsQuery = useAcademicMonthOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();

  const scoresQuery = useMonthlyCustomComponentScoresQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicMonthId: monthFilter === "all" ? undefined : monthFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const monthlyGradesQuery = useMonthlyGradeOptionsQuery({
    academicMonthId: monthFilter === "all" ? undefined : monthFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
  });

  const selectedMonthlyGrade = React.useMemo(
    () =>
      (monthlyGradesQuery.data ?? []).find(
        (item) => item.id === form.monthlyGradeId,
      ),
    [monthlyGradesQuery.data, form.monthlyGradeId],
  );

  const selectedEditingSection = React.useMemo(() => {
    if (!editingItem) {
      return undefined;
    }

    return (sectionsQuery.data ?? []).find(
      (item) => item.id === editingItem.monthlyGrade.studentEnrollment.section.id,
    );
  }, [sectionsQuery.data, editingItem]);

  const gradingPolicyContext = React.useMemo(() => {
    if (selectedMonthlyGrade) {
      return {
        gradingPolicyId: selectedMonthlyGrade.gradingPolicyId,
        academicYearId: selectedMonthlyGrade.academicYearId,
        gradeLevelId: selectedMonthlyGrade.studentEnrollment.section.gradeLevel.id,
        subjectId: selectedMonthlyGrade.subjectId,
      };
    }

    if (editingItem && selectedEditingSection) {
      return {
        gradingPolicyId: editingItem.monthlyGrade.gradingPolicyId,
        academicYearId: editingItem.monthlyGrade.academicYearId,
        gradeLevelId: selectedEditingSection.gradeLevelId,
        subjectId: editingItem.monthlyGrade.subjectId,
      };
    }

    return null;
  }, [selectedMonthlyGrade, editingItem, selectedEditingSection]);

  const componentsQuery = useGradingPolicyComponentOptionsQuery({
    context: gradingPolicyContext,
  });

  const createMutation = useCreateMonthlyCustomComponentScoreMutation();
  const updateMutation = useUpdateMonthlyCustomComponentScoreMutation();
  const deleteMutation = useDeleteMonthlyCustomComponentScoreMutation();

  const records = scoresQuery.data?.data ?? [];
  const pagination = scoresQuery.data?.pagination;

  const selectedComponent = (componentsQuery.data ?? []).find(
    (component) => component.id === form.gradingPolicyComponentId,
  );

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setEditingId(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!form.monthlyGradeId || !form.gradingPolicyComponentId) {
      setFormError("الدرجة الشهرية والمكوّن مطلوبان.");
      return false;
    }

    if (form.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    const score = parseScore(form.score);
    if (score === undefined || score < 0) {
      setFormError("الدرجة يجب أن تكون رقمًا صالحًا أكبر من أو يساوي 0.");
      return false;
    }

    if (!selectedComponent) {
      setFormError("المكوّن المحدد غير صالح.");
      return false;
    }

    if (score > selectedComponent.maxScore) {
      setFormError(`الدرجة يجب ألا تتجاوز ${selectedComponent.maxScore}.`);
      return false;
    }

    const locked =
      selectedMonthlyGrade?.isLocked ??
      (editingItem ? editingItem.monthlyGrade.isLocked : false);
    if (locked) {
      setFormError("لا يمكن التعديل لأن الدرجة الشهرية مقفلة.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    const parsedScore = parseScore(form.score);
    if (parsedScore === undefined) {
      setFormError("الدرجة غير صالحة.");
      return;
    }

    if (editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية monthly-custom-component-scores.update.");
        return;
      }

      updateMutation.mutate(
        {
          monthlyCustomComponentScoreId: editingId,
          payload: {
            score: parsedScore,
            notes: toOptionalString(form.notes),
            isActive: form.isActive,
          },
        },
        {
          onSuccess: () => resetForm(),
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية monthly-custom-component-scores.create.");
      return;
    }

    createMutation.mutate(
      {
        monthlyGradeId: form.monthlyGradeId,
        gradingPolicyComponentId: form.gradingPolicyComponentId,
        score: parsedScore,
        notes: toOptionalString(form.notes),
        isActive: form.isActive,
      },
      {
        onSuccess: () => resetForm(),
      },
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[500px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            {editingId ? "تعديل مكوّن شهري" : "إضافة مكوّن شهري"}
          </CardTitle>
          <CardDescription>إدارة مكونات التقييم الإضافية للدرجة الشهرية.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.monthlyGradeId}
              disabled={editingId !== null}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  monthlyGradeId: event.target.value,
                  gradingPolicyComponentId: "",
                }))
              }
            >
              <option value="">اختر الدرجة الشهرية *</option>
              {(monthlyGradesQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.studentEnrollment.student.fullName} | {formatNameCodeLabel(item.academicMonth.name, item.academicMonth.code)} |{" "}
                  {formatNameCodeLabel(item.subject.name, item.subject.code)} / {formatNameCodeLabel(item.studentEnrollment.section.name, item.studentEnrollment.section.code)}
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.gradingPolicyComponentId}
              disabled={editingId !== null || !form.monthlyGradeId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  gradingPolicyComponentId: event.target.value,
                }))
              }
            >
              <option value="">اختر المكوّن *</option>
              {(componentsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)} (الحد الأقصى {item.maxScore})
                </option>
              ))}
            </select>

            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.score}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, score: event.target.value }))
              }
              placeholder="الدرجة *"
            />

            <Input
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="ملاحظات"
            />

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

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Medal className="h-4 w-4" />
                  )}
                {editingId ? "حفظ التعديلات" : "إنشاء مكوّن شهري"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>مكوّنات الدرجات الشهرية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="grid gap-2 md:grid-cols-[1fr_170px_150px_150px_110px_auto]"
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
              value={monthFilter}
              onChange={(event) => {
                setPage(1);
                setMonthFilter(event.target.value);
              }}
            >
              <option value="all">كل الأشهر</option>
              {(monthsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sectionFilter}
              onChange={(event) => {
                setPage(1);
                setSectionFilter(event.target.value);
              }}
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
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
          {scoresQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}
          {scoresQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {scoresQuery.error instanceof Error
                ? scoresQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}
          {!scoresQuery.isPending && records.length === 0 ? (
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
                    {item.monthlyGrade.studentEnrollment.student.fullName} -{" "}
                    {item.gradingPolicyComponent.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNameCodeLabel(item.monthlyGrade.academicMonth.name, item.monthlyGrade.academicMonth.code)} |{" "}
                    {formatNameCodeLabel(item.monthlyGrade.studentEnrollment.section.name, item.monthlyGrade.studentEnrollment.section.code)} |{" "}
                    {formatNameCodeLabel(item.monthlyGrade.subject.name, item.monthlyGrade.subject.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الدرجة: {item.score}/{item.gradingPolicyComponent.maxScore}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.monthlyGrade.isLocked ? "default" : "secondary"}>
                    {item.monthlyGrade.isLocked ? "مقفل" : "غير مقفل"}
                  </Badge>
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
                    if (item.monthlyGrade.isLocked || !canUpdate) {
                      return;
                    }
                    setEditingId(item.id);
                    setEditingItem(item);
                    setForm(toFormState(item));
                    setFormError(null);
                  }}
                  disabled={!canUpdate || item.monthlyGrade.isLocked || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateMutation.mutate({
                      monthlyCustomComponentScoreId: item.id,
                      payload: { isActive: !item.isActive },
                    })
                  }
                  disabled={!canUpdate || item.monthlyGrade.isLocked || updateMutation.isPending}
                >
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (!window.confirm("تأكيد الحذف؟")) {
                      return;
                    }
                    deleteMutation.mutate(item.id);
                  }}
                  disabled={!canDelete || item.monthlyGrade.isLocked || deleteMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || scoresQuery.isFetching}
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
                  scoresQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void scoresQuery.refetch()}
                disabled={scoresQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${scoresQuery.isFetching ? "animate-spin" : ""}`}
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









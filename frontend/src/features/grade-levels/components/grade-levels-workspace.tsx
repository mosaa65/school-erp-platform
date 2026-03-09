"use client";

import * as React from "react";
import {
  Layers3,
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
  useCreateGradeLevelMutation,
  useDeleteGradeLevelMutation,
  useUpdateGradeLevelMutation,
} from "@/features/grade-levels/hooks/use-grade-levels-mutations";
import { useGradeLevelsQuery } from "@/features/grade-levels/hooks/use-grade-levels-query";
import type { GradeLevelListItem, GradeStage } from "@/lib/api/client";

type GradeLevelFormState = {
  code: string;
  name: string;
  stage: GradeStage;
  sequence: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: GradeLevelFormState = {
  code: "",
  name: "",
  stage: "PRIMARY",
  sequence: "1",
  isActive: true,
};

const STAGE_OPTIONS: GradeStage[] = [
  "PRE_SCHOOL",
  "PRIMARY",
  "MIDDLE",
  "HIGH",
  "OTHER",
];

const STAGE_LABELS: Record<GradeStage, string> = {
  PRE_SCHOOL: "ما قبل المدرسة",
  PRIMARY: "ابتدائي",
  MIDDLE: "إعدادي",
  HIGH: "ثانوي",
  OTHER: "أخرى",
};

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function toFormState(gradeLevel: GradeLevelListItem): GradeLevelFormState {
  return {
    code: gradeLevel.code,
    name: gradeLevel.name,
    stage: gradeLevel.stage,
    sequence: String(gradeLevel.sequence),
    isActive: gradeLevel.isActive,
  };
}

function stageBadgeVariant(
  stage: GradeStage,
): "default" | "secondary" | "outline" {
  switch (stage) {
    case "PRIMARY":
      return "default";
    case "PRE_SCHOOL":
    case "MIDDLE":
      return "secondary";
    default:
      return "outline";
  }
}

export function GradeLevelsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grade-levels.create");
  const canUpdate = hasPermission("grade-levels.update");
  const canDelete = hasPermission("grade-levels.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<GradeStage | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingGradeLevelId, setEditingGradeLevelId] = React.useState<string | null>(
    null,
  );
  const [formState, setFormState] = React.useState<GradeLevelFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const gradeLevelsQuery = useGradeLevelsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    stage: stageFilter === "all" ? undefined : stageFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateGradeLevelMutation();
  const updateMutation = useUpdateGradeLevelMutation();
  const deleteMutation = useDeleteGradeLevelMutation();

  const gradeLevels = React.useMemo(
    () => gradeLevelsQuery.data?.data ?? [],
    [gradeLevelsQuery.data?.data],
  );
  const pagination = gradeLevelsQuery.data?.pagination;
  const isEditing = editingGradeLevelId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = gradeLevels.some(
      (gradeLevel) => gradeLevel.id === editingGradeLevelId,
    );

    if (!stillExists) {
      setEditingGradeLevelId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingGradeLevelId, gradeLevels, isEditing]);

  const resetForm = () => {
    setEditingGradeLevelId(null);
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
    const sequence = Number(formState.sequence);

    if (!code || !name) {
      setFormError("الحقول الأساسية مطلوبة: الكود والاسم.");
      return false;
    }

    if (!/^[a-z0-9_.:-]+$/.test(code)) {
      setFormError("صيغة الكود غير صحيحة.");
      return false;
    }

    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 1000) {
      setFormError("الترتيب يجب أن يكون رقمًا صحيحًا بين 1 و 1000.");
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
      stage: formState.stage,
      sequence: Number(formState.sequence),
      isActive: formState.isActive,
    };

    if (isEditing && editingGradeLevelId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: grade-levels.update.");
        return;
      }

      updateMutation.mutate(
        {
          gradeLevelId: editingGradeLevelId,
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
      setFormError("لا تملك الصلاحية المطلوبة: grade-levels.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (gradeLevel: GradeLevelListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingGradeLevelId(gradeLevel.id);
    setFormState(toFormState(gradeLevel));
  };

  const handleDelete = (gradeLevel: GradeLevelListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الصف/المرحلة ${gradeLevel.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(gradeLevel.id, {
      onSuccess: () => {
        if (editingGradeLevelId === gradeLevel.id) {
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
            <Layers3 className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل مرحلة/صف" : "إنشاء مرحلة/صف"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل كود واسم ومرحلة وحالة الصف الدراسي."
              : "إضافة مرحلة/صف جديد ضمن النواة الأكاديمية."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>grade-levels.create</code>.
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
                  placeholder="grade-01"
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
                  placeholder="الصف الأول"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">المرحلة *</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.stage}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        stage: event.target.value as GradeStage,
                      }))
                    }
                  >
                    {STAGE_OPTIONS.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">الترتيب *</label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={formState.sequence}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, sequence: event.target.value }))
                    }
                    required
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
                    <Layers3 className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء مرحلة/صف"}
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
            <CardTitle>قائمة المراحل/الصفوف</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة المراحل/الصفوف مع الفلترة بالبحث والمرحلة والحالة.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_180px_150px_auto]"
          >
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
              value={stageFilter}
              onChange={(event) => {
                setPage(1);
                setStageFilter(event.target.value as GradeStage | "all");
              }}
            >
              <option value="all">كل المراحل</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
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
          {gradeLevelsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {gradeLevelsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {gradeLevelsQuery.error instanceof Error
                ? gradeLevelsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!gradeLevelsQuery.isPending && gradeLevels.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد مراحل/صفوف مطابقة.
            </div>
          ) : null}

          {gradeLevels.map((gradeLevel) => (
            <div
              key={gradeLevel.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{gradeLevel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{gradeLevel.code}</code> - الترتيب: {gradeLevel.sequence}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الشعب: {gradeLevel.sections.length}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={stageBadgeVariant(gradeLevel.stage)}>
                    {STAGE_LABELS[gradeLevel.stage]}
                  </Badge>
                  <Badge variant={gradeLevel.isActive ? "default" : "outline"}>
                    {gradeLevel.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              {gradeLevel.sections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {gradeLevel.sections.slice(0, 4).map((section) => (
                    <Badge key={section.id} variant="outline">
                      {section.code}
                    </Badge>
                  ))}
                  {gradeLevel.sections.length > 4 ? (
                    <Badge variant="outline">+{gradeLevel.sections.length - 4}</Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(gradeLevel)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(gradeLevel)}
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
                disabled={!pagination || pagination.page <= 1 || gradeLevelsQuery.isFetching}
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
                  gradeLevelsQuery.isFetching
                }
              >
                التالي
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void gradeLevelsQuery.refetch()}
                disabled={gradeLevelsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${gradeLevelsQuery.isFetching ? "animate-spin" : ""}`}
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






"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  GripVertical,
  Layers3,
  Loader2,
  Medal,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { TextareaField } from "@/components/ui/textarea-field";
import { useGradeLevelOptionsQuery } from "@/features/student-enrollments/hooks/use-grade-level-options-query";
import { useHomeworkTypeOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-type-options-query";
import { useSubjectOptionsQuery } from "@/features/assignments/homeworks/hooks/use-subject-options-query";
import {
  useCreateHomeworkRubricMutation,
  useDeleteHomeworkRubricMutation,
  useUpdateHomeworkRubricMutation,
} from "@/features/assignments/homework-rubrics/hooks/use-homework-rubrics-mutations";
import { useHomeworkRubricsQuery } from "@/features/assignments/homework-rubrics/hooks/use-homework-rubrics-query";
import {
  type HomeworkRubricDifficulty,
  type HomeworkRubricListItem,
  type CreateHomeworkRubricPayload,
} from "@/lib/api/client";
import { formatNameCodeLabel } from "@/lib/option-labels";
import { cn } from "@/lib/utils";

type RubricCriterion = {
  id: string;
  title: string;
  description: string;
  maxScore: string;
  weight: string;
  isActive: boolean;
};

type RubricFormState = {
  name: string;
  description: string;
  homeworkTypeId: string;
  subjectId: string;
  gradeLevelId: string;
  difficulty: HomeworkRubricDifficulty;
  maxScore: string;
  isActive: boolean;
  criteria: RubricCriterion[];
};

type StatusTone = "success" | "error" | "info";

type StatusBanner = {
  tone: StatusTone;
  message: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createCriterion(
  title = "",
  description = "",
  maxScore = "2.5",
  weight = "25",
): RubricCriterion {
  return {
    id: createId(),
    title,
    description,
    maxScore,
    weight,
    isActive: true,
  };
}

function createInitialForm(): RubricFormState {
  return {
    name: "",
    description: "",
    homeworkTypeId: "",
    subjectId: "",
    gradeLevelId: "",
    difficulty: "BALANCED",
    maxScore: "10",
    isActive: true,
    criteria: [
      createCriterion("فهم المطلوب", "يعكس الحل فهم الطالب للتعليمات.", "2.5", "25"),
      createCriterion("صحة الإجابة", "دقة الحل وخلوه من الأخطاء الجوهرية.", "3", "30"),
      createCriterion("خطوات الحل", "وضوح التدرج والترتيب في الحل.", "2.5", "25"),
      createCriterion("تنظيم العرض", "النظافة والترتيب وجودة التسليم.", "2", "20"),
    ],
  };
}

function getDifficultyLabel(value: HomeworkRubricDifficulty) {
  if (value === "FOUNDATION") {
    return "تأسيسي";
  }

  if (value === "CHALLENGE") {
    return "تحدي";
  }

  return "متوازن";
}

function getDifficultyTone(value: HomeworkRubricDifficulty) {
  if (value === "FOUNDATION") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  if (value === "CHALLENGE") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";
}

function getNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير متوقع";
}

function mapRubricToForm(rubric: HomeworkRubricListItem): RubricFormState {
  return {
    name: rubric.name,
    description: rubric.description ?? "",
    homeworkTypeId: rubric.homeworkTypeId ?? "",
    subjectId: rubric.subjectId ?? "",
    gradeLevelId: rubric.gradeLevelId ?? "",
    difficulty: rubric.difficulty,
    maxScore: String(rubric.maxScore),
    isActive: rubric.isActive,
    criteria: rubric.criteria
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        description: criterion.description ?? "",
        maxScore: String(criterion.maxScore),
        weight: String(criterion.weight),
        isActive: criterion.isActive,
      })),
  };
}

function buildPayloadFromForm(
  formState: RubricFormState,
): CreateHomeworkRubricPayload {
  const criteria = formState.criteria.map((criterion, index) => ({
    id: criterion.id,
    title: criterion.title.trim(),
    description: criterion.description.trim() || undefined,
    maxScore: getNumber(criterion.maxScore),
    weight: getNumber(criterion.weight),
    sortOrder: index + 1,
    isActive: criterion.isActive,
  }));

  return {
    name: formState.name.trim(),
    description: formState.description.trim() || undefined,
    homeworkTypeId: formState.homeworkTypeId || null,
    subjectId: formState.subjectId || null,
    gradeLevelId: formState.gradeLevelId || null,
    difficulty: formState.difficulty,
    maxScore: getNumber(formState.maxScore),
    criteria,
    isActive: formState.isActive,
  };
}

export function HomeworkRubricsWorkspace() {
  const homeworkTypesQuery = useHomeworkTypeOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const rubricsQuery = useHomeworkRubricsQuery({
    page: 1,
    limit: 50,
  });
  const createRubricMutation = useCreateHomeworkRubricMutation();
  const updateRubricMutation = useUpdateHomeworkRubricMutation();
  const deleteRubricMutation = useDeleteHomeworkRubricMutation();

  const [editingRubricId, setEditingRubricId] = React.useState<string | null>(
    null,
  );
  const [formState, setFormState] = React.useState<RubricFormState>(
    createInitialForm,
  );
  const [statusBanner, setStatusBanner] = React.useState<StatusBanner | null>(
    null,
  );

  const rubrics = rubricsQuery.data?.data ?? [];

  const selectedHomeworkType = React.useMemo(
    () =>
      (homeworkTypesQuery.data ?? []).find(
        (type) => type.id === formState.homeworkTypeId,
      ) ?? null,
    [formState.homeworkTypeId, homeworkTypesQuery.data],
  );
  const selectedSubject = React.useMemo(
    () =>
      (subjectsQuery.data ?? []).find((subject) => subject.id === formState.subjectId) ??
      null,
    [formState.subjectId, subjectsQuery.data],
  );
  const selectedGradeLevel = React.useMemo(
    () =>
      (gradeLevelsQuery.data ?? []).find(
        (gradeLevel) => gradeLevel.id === formState.gradeLevelId,
      ) ?? null,
    [formState.gradeLevelId, gradeLevelsQuery.data],
  );

  const totalScore = React.useMemo(
    () =>
      formState.criteria.reduce(
        (total, criterion) => total + getNumber(criterion.maxScore),
        0,
      ),
    [formState.criteria],
  );
  const totalWeight = React.useMemo(
    () =>
      formState.criteria.reduce(
        (total, criterion) => total + getNumber(criterion.weight),
        0,
      ),
    [formState.criteria],
  );
  const maxScore = getNumber(formState.maxScore);
  const isBalanced =
    Math.abs(totalScore - maxScore) < 0.01 &&
    Math.abs(totalWeight - 100) < 0.01;
  const isSaving =
    createRubricMutation.isPending ||
    updateRubricMutation.isPending ||
    deleteRubricMutation.isPending;

  function showStatus(message: string, tone: StatusTone = "info") {
    setStatusBanner({ tone, message });
  }

  function updateForm(patch: Partial<RubricFormState>) {
    setFormState((current) => ({
      ...current,
      ...patch,
    }));
    setStatusBanner(null);
  }

  function updateCriterion(
    criterionId: string,
    patch: Partial<RubricCriterion>,
  ) {
    setFormState((current) => ({
      ...current,
      criteria: current.criteria.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, ...patch } : criterion,
      ),
    }));
    setStatusBanner(null);
  }

  function removeCriterion(criterionId: string) {
    setFormState((current) => ({
      ...current,
      criteria: current.criteria.filter((criterion) => criterion.id !== criterionId),
    }));
    setStatusBanner(null);
  }

  function addCriterion() {
    setFormState((current) => ({
      ...current,
      criteria: [...current.criteria, createCriterion("معيار جديد", "", "1", "10")],
    }));
    setStatusBanner(null);
  }

  function resetForm() {
    setEditingRubricId(null);
    setFormState(createInitialForm());
    setStatusBanner(null);
  }

  function generateSmartRubric() {
    const subjectName = selectedSubject?.name ?? "المادة";
    const typeName = selectedHomeworkType?.name ?? "الواجب";
    const gradeLevelName = selectedGradeLevel?.name ?? "";
    const score = getNumber(formState.maxScore) || 10;
    const rounded = Math.round((score / 4) * 100) / 100;
    const lastScore = Math.round((score - rounded * 3) * 100) / 100;

    setFormState((current) => ({
      ...current,
      name: current.name || `معيار ${typeName} - ${subjectName}`,
      description:
        current.description ||
        `معيار متوازن لتصحيح ${typeName} في ${subjectName}${gradeLevelName ? ` للصف ${gradeLevelName}` : ""}.`,
      criteria: [
        createCriterion(
          "فهم الهدف",
          `يركز على فهم الطالب لفكرة ${subjectName} المطلوبة في ${typeName}.`,
          String(rounded),
          "25",
        ),
        createCriterion(
          "صحة الحل",
          "دقة الإجابة والقدرة على الوصول إلى نتيجة صحيحة.",
          String(rounded),
          "25",
        ),
        createCriterion(
          "الاستدلال والخطوات",
          "وضوح التفكير وترتيب الخطوات وتبرير الإجابة.",
          String(rounded),
          "25",
        ),
        createCriterion(
          "جودة التسليم",
          "النظافة والتنظيم والالتزام بالتعليمات والتسليم في الوقت.",
          String(lastScore),
          "25",
        ),
      ],
    }));
    showStatus("تم توليد قالب ذكي ويمكنك تعديله قبل الحفظ.", "success");
  }

  function normalizeCriteria() {
    const score = getNumber(formState.maxScore) || 10;
    const criteriaCount = Math.max(formState.criteria.length, 1);
    const scorePerCriterion = Math.round((score / criteriaCount) * 100) / 100;
    const weightPerCriterion = Math.round((100 / criteriaCount) * 100) / 100;

    setFormState((current) => ({
      ...current,
      criteria: current.criteria.map((criterion, index) => {
        const isLast = index === current.criteria.length - 1;
        const criterionScore = isLast
          ? Math.round((score - scorePerCriterion * (criteriaCount - 1)) * 100) /
            100
          : scorePerCriterion;
        const criterionWeight = isLast
          ? Math.round((100 - weightPerCriterion * (criteriaCount - 1)) * 100) /
            100
          : weightPerCriterion;

        return {
          ...criterion,
          maxScore: String(criterionScore),
          weight: String(criterionWeight),
        };
      }),
    }));
    showStatus("تم توزيع الدرجات والأوزان بالتساوي.", "success");
  }

  async function saveCurrentRubric() {
    const name = formState.name.trim();
    if (!name) {
      showStatus("اكتب اسم معيار التصحيح قبل الحفظ.", "error");
      return;
    }

    if (!formState.criteria.length) {
      showStatus("أضف معيارًا واحدًا على الأقل.", "error");
      return;
    }

    const payload = buildPayloadFromForm(formState);
    if (!payload.maxScore || payload.maxScore <= 0) {
      showStatus("الدرجة الكلية يجب أن تكون أكبر من صفر.", "error");
      return;
    }

    try {
      if (editingRubricId) {
        const rubric = await updateRubricMutation.mutateAsync({
          homeworkRubricId: editingRubricId,
          payload,
        });
        setEditingRubricId(rubric.id);
        setFormState(mapRubricToForm(rubric));
        showStatus("تم تحديث معيار التصحيح بنجاح.", "success");
        return;
      }

      const rubric = await createRubricMutation.mutateAsync(
        payload,
      );
      setEditingRubricId(rubric.id);
      setFormState(mapRubricToForm(rubric));
      showStatus("تم حفظ معيار التصحيح بنجاح.", "success");
    } catch (error) {
      showStatus(getApiErrorMessage(error), "error");
    }
  }

  function editRubric(rubric: HomeworkRubricListItem) {
    setEditingRubricId(rubric.id);
    setFormState(mapRubricToForm(rubric));
    showStatus("تم فتح المعيار للتعديل.", "info");
  }

  async function duplicateRubric(rubric: HomeworkRubricListItem) {
    const payload: CreateHomeworkRubricPayload = {
      name: `نسخة من ${rubric.name}`,
      description: rubric.description ?? undefined,
      homeworkTypeId: rubric.homeworkTypeId ?? null,
      subjectId: rubric.subjectId ?? null,
      gradeLevelId: rubric.gradeLevelId ?? null,
      difficulty: rubric.difficulty,
      maxScore: rubric.maxScore,
      isActive: true,
      criteria: rubric.criteria
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((criterion, index) => ({
          title: criterion.title,
          description: criterion.description ?? undefined,
          maxScore: Number(criterion.maxScore),
          weight: Number(criterion.weight),
          sortOrder: index + 1,
          isActive: criterion.isActive,
        })),
    };

    try {
      const created = await createRubricMutation.mutateAsync(payload);
      setEditingRubricId(created.id);
      setFormState(mapRubricToForm(created));
      showStatus("تم إنشاء نسخة جديدة من المعيار.", "success");
    } catch (error) {
      showStatus(getApiErrorMessage(error), "error");
    }
  }

  async function deleteRubric(rubric: HomeworkRubricListItem) {
    const confirmed = window.confirm(
      `هل تريد حذف معيار التصحيح "${rubric.name}"؟`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteRubricMutation.mutateAsync(rubric.id);
      if (editingRubricId === rubric.id) {
        resetForm();
      }
      showStatus("تم حذف معيار التصحيح.", "success");
    } catch (error) {
      showStatus(getApiErrorMessage(error), "error");
    }
  }

  const messageClassName = cn(
    "rounded-xl border px-4 py-3 text-sm",
    statusBanner?.tone === "success" &&
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    statusBanner?.tone === "error" &&
      "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    statusBanner?.tone === "info" &&
      "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <Medal className="h-3.5 w-3.5" />
              معايير التصحيح
            </div>
            <h1 className="text-2xl font-semibold">بناء معيار التصحيح</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              بناء معايير تصحيح ذكية مرتبطة بنوع الواجب والمادة والمرحلة، مع حفظ
              مركزي ومشاركة مباشرة بين الفريق.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/homework-studio">
                <Sparkles />
                الاستوديو
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-submissions">
                <ClipboardCheck />
                التصحيح
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/60 p-4">
            <div>
              <h2 className="font-semibold">بناء معيار تصحيح</h2>
              <p className="text-xs text-muted-foreground">
                عدّل البيانات ثم احفظها لتصبح متاحة في النظام كاملًا.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={generateSmartRubric}
                disabled={isSaving}
              >
                <Wand2 />
                توليد مقترح
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={normalizeCriteria}
                disabled={isSaving}
              >
                <RefreshCw />
                توزيع تلقائي
              </Button>
              <Button type="button" onClick={saveCurrentRubric} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {isSaving ? "جارٍ الحفظ" : "حفظ"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium lg:col-span-2">
              <span>اسم معيار التصحيح</span>
              <Input
                icon={<Medal />}
                value={formState.name}
                onChange={(event) => updateForm({ name: event.target.value })}
                placeholder="مثال: معيار تصحيح واجب التحليل"
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium lg:col-span-2">
              <span>الوصف</span>
              <TextareaField
                rows={3}
                value={formState.description}
                onChange={(event) =>
                  updateForm({ description: event.target.value })
                }
                placeholder="اكتب وصفًا مختصرًا يشرح الغرض من هذا المعيار."
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              <span>نوع الواجب</span>
              <SelectField
                icon={<Layers3 />}
                value={formState.homeworkTypeId}
                onChange={(event) =>
                  updateForm({ homeworkTypeId: event.target.value })
                }
                disabled={homeworkTypesQuery.isPending}
              >
                <option value="">عام</option>
                {(homeworkTypesQuery.data ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {formatNameCodeLabel(type.name, type.code)}
                  </option>
                ))}
              </SelectField>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              <span>المادة</span>
              <SelectField
                icon={<BookOpenCheck />}
                value={formState.subjectId}
                onChange={(event) => updateForm({ subjectId: event.target.value })}
                disabled={subjectsQuery.isPending}
              >
                <option value="">كل المواد</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {formatNameCodeLabel(subject.name, subject.code)}
                  </option>
                ))}
              </SelectField>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              <span>الصف/المرحلة</span>
              <SelectField
                icon={<FileText />}
                value={formState.gradeLevelId}
                onChange={(event) =>
                  updateForm({ gradeLevelId: event.target.value })
                }
                disabled={gradeLevelsQuery.isPending}
              >
                <option value="">كل الصفوف</option>
                {(gradeLevelsQuery.data ?? []).map((gradeLevel) => (
                  <option key={gradeLevel.id} value={gradeLevel.id}>
                    {formatNameCodeLabel(gradeLevel.name, gradeLevel.code)}
                  </option>
                ))}
              </SelectField>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              <span>المستوى</span>
              <div className="grid grid-cols-3 gap-2">
                {(["FOUNDATION", "BALANCED", "CHALLENGE"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={cn(
                      "h-10 rounded-xl border px-3 text-sm transition-colors",
                      formState.difficulty === level
                        ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                        : "bg-background text-muted-foreground hover:bg-muted/35",
                    )}
                    onClick={() => updateForm({ difficulty: level })}
                  >
                    {getDifficultyLabel(level)}
                  </button>
                ))}
              </div>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              <span>الدرجة الكلية</span>
              <Input
                icon={<CheckCircle2 />}
                type="number"
                min={0.01}
                step="0.25"
                value={formState.maxScore}
                onChange={(event) => updateForm({ maxScore: event.target.value })}
              />
            </label>

            <div className="space-y-1.5 text-sm font-medium">
              <span>الحالة</span>
              <div className="flex h-11 items-center justify-between rounded-xl border px-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">نشط</div>
                  <div className="text-xs text-muted-foreground">
                    يظهر في النظام ويمكن استخدامه مباشرة.
                  </div>
                </div>
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={(checked) => updateForm({ isActive: checked })}
                />
              </div>
            </div>
          </div>

          <div className="border-t p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    isBalanced
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  )}
                >
                  مجموع الدرجات: {totalScore} / {maxScore || 0}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    Math.abs(totalWeight - 100) < 0.01
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  )}
                >
                  الوزن: {totalWeight}%
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    formState.isActive
                      ? "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      : "border-muted-foreground/20 bg-muted/20 text-muted-foreground",
                  )}
                >
                  {formState.isActive ? "نشط" : "موقوف"}
                </Badge>
              </div>
              <Button type="button" variant="outline" onClick={addCriterion} disabled={isSaving}>
                <Plus />
                معيار جديد
              </Button>
            </div>

            <div className="grid gap-3">
              {formState.criteria.map((criterion, index) => (
                <Card key={criterion.id} className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm">
                  <CardContent className="grid gap-3 p-4 lg:grid-cols-[32px_minmax(0,1fr)_120px_120px_auto]">
                    <div className="flex h-10 items-center justify-center rounded-xl border bg-muted/20 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="grid gap-2">
                      <Input
                        value={criterion.title}
                        onChange={(event) =>
                          updateCriterion(criterion.id, { title: event.target.value })
                        }
                        placeholder={`معيار ${index + 1}`}
                      />
                      <TextareaField
                        rows={2}
                        value={criterion.description}
                        onChange={(event) =>
                          updateCriterion(criterion.id, {
                            description: event.target.value,
                          })
                        }
                        placeholder="وصف مختصر لما يتم تقييمه"
                      />
                    </div>
                    <label className="space-y-1 text-xs font-medium">
                      <span>الدرجة</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.25"
                        value={criterion.maxScore}
                        onChange={(event) =>
                          updateCriterion(criterion.id, {
                            maxScore: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-1 text-xs font-medium">
                      <span>الوزن %</span>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={criterion.weight}
                        onChange={(event) =>
                          updateCriterion(criterion.id, {
                            weight: event.target.value,
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeCriterion(criterion.id)}
                      disabled={formState.criteria.length <= 1 || isSaving}
                      aria-label="حذف المعيار"
                    >
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {statusBanner ? (
            <div className="border-t p-4">
              <div className={messageClassName}>{statusBanner.message}</div>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4">
          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">المعايير المحفوظة</h2>
                <Badge variant="outline">{rubrics.length}</Badge>
              </div>

              {rubricsQuery.isPending ? (
                <div className="rounded-xl border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
                  جارٍ تحميل معايير التصحيح...
                </div>
              ) : rubricsQuery.isError ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                  {getApiErrorMessage(rubricsQuery.error)}
                </div>
              ) : rubrics.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
                  لا توجد معايير محفوظة بعد.
                </div>
              ) : (
                <div className="grid gap-2">
                  {rubrics.map((rubric) => (
                    <div key={rubric.id} className="rounded-xl border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate font-medium">{rubric.name}</div>
                            <Badge variant="outline">{rubric.code}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rubric.homeworkType
                              ? formatNameCodeLabel(
                                  rubric.homeworkType.name,
                                  rubric.homeworkType.code,
                                )
                              : "عام"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rubric.subject
                              ? formatNameCodeLabel(rubric.subject.name, rubric.subject.code)
                              : "كل المواد"}
                            {rubric.gradeLevel ? ` - ${rubric.gradeLevel.name}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            آخر تعديل: {formatDate(rubric.updatedAt)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline">{rubric.maxScore}</Badge>
                          <Badge variant="outline" className={cn(getDifficultyTone(rubric.difficulty))}>
                            {getDifficultyLabel(rubric.difficulty)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              rubric.isActive
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-muted-foreground/20 bg-muted/20 text-muted-foreground",
                            )}
                          >
                            {rubric.isActive ? "نشط" : "موقوف"}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {rubric.criteria.length} معايير
                        </Badge>
                        {rubric.description ? (
                          <Badge variant="outline" className="max-w-full truncate">
                            {rubric.description}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => editRubric(rubric)}
                          disabled={isSaving}
                        >
                          فتح
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateRubric(rubric)}
                          disabled={isSaving}
                        >
                          <Copy />
                          نسخ
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRubric(rubric)}
                          disabled={isSaving}
                        >
                          <Trash2 />
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm">
            <CardContent className="space-y-3 p-4">
              <h2 className="font-semibold">ملاحظات تنفيذية</h2>
              <div className="rounded-xl border bg-muted/15 p-3 text-sm leading-6 text-muted-foreground">
                هذا القسم مرتبط مباشرة بقاعدة البيانات، لذلك أي معيار تصحيح يتم
                حفظه هنا يظهر لباقي الفريق فورًا ويمكن إعادة استخدامه في الواجبات
                والتصحيح.
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

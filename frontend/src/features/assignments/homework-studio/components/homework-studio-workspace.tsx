"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  Inbox,
  Layers3,
  Loader2,
  MessageSquareText,
  Medal,
  RefreshCw,
  School,
  Send,
  Sparkles,
  Target,
  UsersRound,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useHomeworksDashboardQuery } from "@/features/assignments/homework-dashboard/hooks/use-homeworks-dashboard-query";
import { useAcademicTermOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-term-options-query";
import { useAcademicYearOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-year-options-query";
import { useHomeworkTemplateOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-template-options-query";
import { useHomeworkTypeOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-type-options-query";
import {
  useApproveHomeworkMutation,
  useCreateHomeworkMutation,
} from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { useSectionOptionsQuery } from "@/features/assignments/homeworks/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/assignments/homeworks/hooks/use-subject-options-query";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import type { HomeworkTemplateListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";
import { cn } from "@/lib/utils";

type StudioFormState = {
  academicYearId: string;
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  homeworkTypeId: string;
  templateId: string;
  title: string;
  homeworkDate: string;
  dueDate: string;
  maxScore: string;
  content: string;
  notes: string;
  difficulty: "FOUNDATION" | "BALANCED" | "CHALLENGE";
  estimatedMinutes: string;
  autoPopulateStudents: boolean;
};

type SubmitMode = "draft" | "approve";

const DEFAULT_DUE_DATE_OFFSET_DAYS = 5;
const MS_PER_DAY = 86_400_000;

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysToDateInput(value: string, days: number): string {
  const date = fromDateInput(value);
  date.setDate(date.getDate() + days);
  return toLocalDateInput(date);
}

function toDateIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function toDateEndIso(value: string): string {
  return `${value}T23:59:59.999Z`;
}

function createInitialState(): StudioFormState {
  const homeworkDate = toLocalDateInput(new Date());

  return {
    academicYearId: "",
    academicTermId: "",
    sectionId: "",
    subjectId: "",
    homeworkTypeId: "",
    templateId: "",
    title: "",
    homeworkDate,
    dueDate: addDaysToDateInput(homeworkDate, DEFAULT_DUE_DATE_OFFSET_DAYS),
    maxScore: "10",
    content: "",
    notes: "",
    difficulty: "BALANCED",
    estimatedMinutes: "30",
    autoPopulateStudents: true,
  };
}

function getDaysBetween(start: string, end: string): number | null {
  if (!start || !end) {
    return null;
  }

  const startDate = fromDateInput(start);
  const endDate = fromDateInput(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(date);
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "تعذر تنفيذ العملية.";
}

function getDifficultyLabel(value: StudioFormState["difficulty"]): string {
  if (value === "FOUNDATION") {
    return "تأسيسي";
  }

  if (value === "CHALLENGE") {
    return "تحدي";
  }

  return "متوازن";
}

function buildSmartDraft({
  subjectName,
  typeName,
  sectionName,
  difficulty,
  estimatedMinutes,
}: {
  subjectName: string;
  typeName: string;
  sectionName: string;
  difficulty: StudioFormState["difficulty"];
  estimatedMinutes: string;
}) {
  const difficultyLabel = getDifficultyLabel(difficulty);

  return {
    title: `${typeName} - ${subjectName}`,
    content: [
      `المستوى: ${difficultyLabel}`,
      `المدة المتوقعة: ${estimatedMinutes || "30"} دقيقة`,
      "",
      "المطلوب:",
      "1. مراجعة نقاط الدرس الأساسية.",
      "2. حل الأسئلة بخطوات واضحة.",
      "3. كتابة الملاحظات أو الصعوبات في نهاية الحل.",
      "",
      `النطاق: ${sectionName}`,
    ].join("\n"),
    notes: `مقترح ذكي: ${difficultyLabel} / ${estimatedMinutes || "30"} دقيقة`,
  };
}

function isTemplateUsable(template: HomeworkTemplateListItem, subjectId: string) {
  return !template.subjectId || !subjectId || template.subjectId === subjectId;
}

export function HomeworkStudioWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("homeworks.create");
  const canApprove = hasPermission("homeworks.approve");
  const canReadReports =
    hasPermission("homeworks.dashboard") || hasPermission("homework-reports.read");

  const [formState, setFormState] = React.useState<StudioFormState>(
    createInitialState,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const academicTermsQuery = useAcademicTermOptionsQuery(
    formState.academicYearId || undefined,
  );
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const homeworkTypesQuery = useHomeworkTypeOptionsQuery();

  const selectedSection = React.useMemo(
    () =>
      (sectionsQuery.data ?? []).find((section) => section.id === formState.sectionId) ??
      null,
    [formState.sectionId, sectionsQuery.data],
  );
  const selectedSubject = React.useMemo(
    () =>
      (subjectsQuery.data ?? []).find((subject) => subject.id === formState.subjectId) ??
      null,
    [formState.subjectId, subjectsQuery.data],
  );
  const selectedHomeworkType = React.useMemo(
    () =>
      (homeworkTypesQuery.data ?? []).find(
        (type) => type.id === formState.homeworkTypeId,
      ) ?? null,
    [formState.homeworkTypeId, homeworkTypesQuery.data],
  );
  const selectedAcademicYear = React.useMemo(
    () =>
      (academicYearsQuery.data ?? []).find(
        (year) => year.id === formState.academicYearId,
      ) ?? null,
    [academicYearsQuery.data, formState.academicYearId],
  );
  const selectedAcademicTerm = React.useMemo(
    () =>
      (academicTermsQuery.data ?? []).find(
        (term) => term.id === formState.academicTermId,
      ) ?? null,
    [academicTermsQuery.data, formState.academicTermId],
  );

  const templatesQuery = useHomeworkTemplateOptionsQuery({
    homeworkTypeId: formState.homeworkTypeId || undefined,
    subjectId: formState.subjectId || undefined,
    gradeLevelId: selectedSection?.gradeLevel?.id,
  });
  const templates = React.useMemo(
    () =>
      (templatesQuery.data ?? []).filter((template) =>
        isTemplateUsable(template, formState.subjectId),
      ),
    [formState.subjectId, templatesQuery.data],
  );

  const dashboardQuery = useHomeworksDashboardQuery({
    academicYearId: formState.academicYearId || undefined,
    academicTermId: formState.academicTermId || undefined,
    sectionId: formState.sectionId || undefined,
    subjectId: formState.subjectId || undefined,
    fromDate: formState.homeworkDate ? toDateIso(formState.homeworkDate) : undefined,
    toDate: formState.dueDate
      ? toDateEndIso(formState.dueDate)
      : formState.homeworkDate
        ? toDateEndIso(formState.homeworkDate)
        : undefined,
  });

  const createMutation = useCreateHomeworkMutation();
  const approveMutation = useApproveHomeworkMutation();

  const daysToDue = getDaysBetween(formState.homeworkDate, formState.dueDate);
  const scoreNumber = Number(formState.maxScore);
  const estimatedMinutes = Number(formState.estimatedMinutes);
  const dashboardMetrics = dashboardQuery.data?.metrics;

  const readinessItems = React.useMemo(() => {
    const items = [
      {
        label: "السياق الأكاديمي",
        done: Boolean(formState.academicYearId && formState.academicTermId),
      },
      {
        label: "الشعبة والمادة",
        done: Boolean(formState.sectionId && formState.subjectId),
      },
      {
        label: "نوع الواجب",
        done: Boolean(formState.homeworkTypeId),
      },
      {
        label: "المحتوى والدرجة",
        done: Boolean(formState.title.trim() && scoreNumber > 0),
      },
      {
        label: "موعد التسليم",
        done: daysToDue !== null && daysToDue >= 0,
      },
    ];

    return items;
  }, [
    daysToDue,
    formState.academicTermId,
    formState.academicYearId,
    formState.homeworkTypeId,
    formState.sectionId,
    formState.subjectId,
    formState.title,
    scoreNumber,
  ]);

  const readinessScore = Math.round(
    (readinessItems.filter((item) => item.done).length / readinessItems.length) * 100,
  );

  const guidanceItems = React.useMemo(() => {
    const items: Array<{
      tone: "good" | "warn" | "danger";
      title: string;
      value: string;
    }> = [];

    if (daysToDue === null) {
      items.push({
        tone: "warn",
        title: "موعد التسليم",
        value: "غير مكتمل",
      });
    } else if (daysToDue < 0) {
      items.push({
        tone: "danger",
        title: "موعد التسليم",
        value: "قبل تاريخ الواجب",
      });
    } else if (daysToDue <= 1) {
      items.push({
        tone: "warn",
        title: "نافذة التسليم",
        value: "قصيرة جدًا",
      });
    } else {
      items.push({
        tone: "good",
        title: "نافذة التسليم",
        value: `${daysToDue} أيام`,
      });
    }

    if (Number.isNaN(scoreNumber) || scoreNumber <= 0) {
      items.push({
        tone: "danger",
        title: "الدرجة",
        value: "غير صالحة",
      });
    } else if (scoreNumber > 100) {
      items.push({
        tone: "warn",
        title: "الدرجة",
        value: "كبيرة",
      });
    } else {
      items.push({
        tone: "good",
        title: "الدرجة",
        value: `${scoreNumber}`,
      });
    }

    if (Number.isNaN(estimatedMinutes) || estimatedMinutes <= 0) {
      items.push({
        tone: "warn",
        title: "المدة",
        value: "غير محددة",
      });
    } else if (estimatedMinutes > 60) {
      items.push({
        tone: "warn",
        title: "المدة",
        value: "مرتفعة",
      });
    } else {
      items.push({
        tone: "good",
        title: "المدة",
        value: `${estimatedMinutes} دقيقة`,
      });
    }

    if ((dashboardMetrics?.totalHomeworks ?? 0) >= 4) {
      items.push({
        tone: "warn",
        title: "حمل الشعبة",
        value: `${dashboardMetrics?.totalHomeworks ?? 0} واجبات`,
      });
    } else {
      items.push({
        tone: "good",
        title: "حمل الشعبة",
        value: `${dashboardMetrics?.totalHomeworks ?? 0} واجبات`,
      });
    }

    return items;
  }, [
    dashboardMetrics?.totalHomeworks,
    daysToDue,
    estimatedMinutes,
    scoreNumber,
  ]);

  React.useEffect(() => {
    const currentYear = (academicYearsQuery.data ?? []).find((year) => year.isCurrent);
    if (!currentYear || formState.academicYearId) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      academicYearId: currentYear.id,
    }));
  }, [academicYearsQuery.data, formState.academicYearId]);

  React.useEffect(() => {
    if (formState.academicTermId) {
      return;
    }

    const today = new Date();
    const matchingTerm = (academicTermsQuery.data ?? []).find((term) => {
      const startDate = new Date(term.startDate);
      const endDate = new Date(term.endDate);
      return today >= startDate && today <= endDate;
    });

    if (!matchingTerm) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      academicTermId: matchingTerm.id,
    }));
  }, [academicTermsQuery.data, formState.academicTermId]);

  function updateForm(patch: Partial<StudioFormState>) {
    setFormState((prev) => ({
      ...prev,
      ...patch,
    }));
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleHomeworkDateChange(value: string) {
    setFormState((prev) => {
      const shouldShiftDueDate =
        !prev.dueDate ||
        prev.dueDate === addDaysToDateInput(prev.homeworkDate, DEFAULT_DUE_DATE_OFFSET_DAYS);

      return {
        ...prev,
        homeworkDate: value,
        dueDate: shouldShiftDueDate
          ? addDaysToDateInput(value, DEFAULT_DUE_DATE_OFFSET_DAYS)
          : prev.dueDate,
      };
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  function applyTemplate(template: HomeworkTemplateListItem) {
    updateForm({
      templateId: template.id,
      title: template.title,
      content: template.content ?? "",
      maxScore: String(template.maxScore ?? 10),
      notes: template.notes ?? "",
      homeworkTypeId: template.homeworkTypeId ?? formState.homeworkTypeId,
      subjectId: template.subjectId ?? formState.subjectId,
    });
  }

  function generateSmartDraft() {
    const sectionName = selectedSection
      ? formatSectionWithGradeLabel(selectedSection)
      : "الشعبة المحددة";
    const subjectName = selectedSubject?.name ?? "المادة";
    const typeName = selectedHomeworkType?.name ?? "واجب";
    const draft = buildSmartDraft({
      subjectName,
      typeName,
      sectionName,
      difficulty: formState.difficulty,
      estimatedMinutes: formState.estimatedMinutes,
    });

    updateForm({
      title: draft.title,
      content: draft.content,
      notes: draft.notes,
    });
  }

  function validateForm() {
    if (!canCreate) {
      return "لا تملك صلاحية إنشاء الواجبات.";
    }

    if (!formState.academicYearId || !formState.academicTermId) {
      return "اختر العام الدراسي والترم.";
    }

    if (!formState.sectionId || !formState.subjectId) {
      return "اختر الشعبة والمادة.";
    }

    if (!formState.homeworkTypeId) {
      return "اختر نوع الواجب.";
    }

    if (!formState.title.trim()) {
      return "اكتب عنوان الواجب.";
    }

    if (!formState.homeworkDate) {
      return "حدد تاريخ الواجب.";
    }

    if (daysToDue !== null && daysToDue < 0) {
      return "موعد التسليم لا يمكن أن يكون قبل تاريخ الواجب.";
    }

    if (Number.isNaN(scoreNumber) || scoreNumber <= 0) {
      return "درجة الواجب يجب أن تكون أكبر من صفر.";
    }

    return null;
  }

  async function handleSubmit(mode: SubmitMode) {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (mode === "approve" && !canApprove) {
      setFormError("لا تملك صلاحية اعتماد الواجب.");
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    try {
      const created = await createMutation.mutateAsync({
        academicYearId: formState.academicYearId,
        academicTermId: formState.academicTermId,
        sectionId: formState.sectionId,
        subjectId: formState.subjectId,
        homeworkTypeId: formState.homeworkTypeId,
        title: formState.title.trim(),
        content: formState.content.trim() || undefined,
        homeworkDate: toDateIso(formState.homeworkDate),
        dueDate: formState.dueDate ? toDateIso(formState.dueDate) : undefined,
        maxScore: scoreNumber,
        notes: formState.notes.trim() || undefined,
        autoPopulateStudents: formState.autoPopulateStudents,
        isActive: true,
      });

      if (mode === "approve") {
        await approveMutation.mutateAsync({
          homeworkId: created.id,
          notes: "اعتماد من استوديو الواجبات الذكي",
          lockAfterApprove: false,
        });
      }

      setSuccessMessage(
        mode === "approve"
          ? "تم إنشاء الواجب واعتماده."
          : "تم إنشاء الواجب بنجاح.",
      );
      setFormState((prev) => ({
        ...createInitialState(),
        academicYearId: prev.academicYearId,
        academicTermId: prev.academicTermId,
        sectionId: prev.sectionId,
        subjectId: prev.subjectId,
        homeworkTypeId: prev.homeworkTypeId,
      }));
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  const mutationError =
    getErrorMessage(createMutation.error) ?? getErrorMessage(approveMutation.error);
  const isSaving = createMutation.isPending || approveMutation.isPending;
  const recentHomeworks = dashboardQuery.data?.recentHomeworks ?? [];
  const topPendingHomeworks = dashboardQuery.data?.topPendingHomeworks ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300">
                <Sparkles className="ml-1 h-3.5 w-3.5" />
                استوديو الواجبات
              </Badge>
              <Badge variant="outline">{readinessScore}% جاهزية</Badge>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              إنشاء واجب ذكي
            </h1>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Signal icon={<School />} label={selectedAcademicYear?.name ?? "عام غير محدد"} />
              <Signal icon={<CalendarClock />} label={selectedAcademicTerm?.name ?? "ترم غير محدد"} />
              <Signal
                icon={<UsersRound />}
                label={
                  selectedSection
                    ? formatSectionWithGradeLabel(selectedSection)
                    : "شعبة غير محددة"
                }
              />
              <Signal
                icon={<BookOpenCheck />}
                label={
                  selectedSubject
                    ? formatNameCodeLabel(selectedSubject.name, selectedSubject.code)
                    : "مادة غير محددة"
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/homeworks">
                <ClipboardCheck />
                سجل الواجبات
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-submissions">
                <Inbox />
                التسليمات
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-calendar">
                <CalendarDays />
                التقويم
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-rubrics">
                <Medal />
                معايير التصحيح
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-dashboard">
                <BarChart3 />
                المؤشرات
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className="overflow-hidden rounded-[28px] border border-border/60 bg-card/85 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] backdrop-blur-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit("draft");
          }}
        >
          <div className="border-b border-border/60 bg-gradient-to-r from-[color:var(--app-accent-soft)]/15 to-background/0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">بيانات الواجب</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  جهّز النطاق، المحتوى، والدرجة في مكان واحد واضح وسريع.
                </p>
              </div>
              <Badge variant="outline">
                <Target className="ml-1 h-3.5 w-3.5" />
                {getDifficultyLabel(formState.difficulty)}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <FormField label="العام الدراسي" required>
              <SelectField
                icon={<School />}
                value={formState.academicYearId}
                onChange={(event) =>
                  updateForm({
                    academicYearId: event.target.value,
                    academicTermId: "",
                  })
                }
                disabled={academicYearsQuery.isPending}
              >
                <option value="">اختر العام</option>
                {(academicYearsQuery.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {formatNameCodeLabel(year.name, year.code)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="الترم" required>
              <SelectField
                icon={<CalendarClock />}
                value={formState.academicTermId}
                onChange={(event) =>
                  updateForm({
                    academicTermId: event.target.value,
                  })
                }
                disabled={academicTermsQuery.isPending}
              >
                <option value="">اختر الترم</option>
                {(academicTermsQuery.data ?? []).map((term) => (
                  <option key={term.id} value={term.id}>
                    {formatNameCodeLabel(term.name, term.code)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="الشعبة" required>
              <SelectField
                icon={<UsersRound />}
                value={formState.sectionId}
                onChange={(event) =>
                  updateForm({
                    sectionId: event.target.value,
                    templateId: "",
                  })
                }
                disabled={sectionsQuery.isPending}
              >
                <option value="">اختر الشعبة</option>
                {(sectionsQuery.data ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {formatSectionWithGradeLabel(section)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="المادة" required>
              <SelectField
                icon={<BookOpenCheck />}
                value={formState.subjectId}
                onChange={(event) =>
                  updateForm({
                    subjectId: event.target.value,
                    templateId: "",
                  })
                }
                disabled={subjectsQuery.isPending}
              >
                <option value="">اختر المادة</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {formatNameCodeLabel(subject.name, subject.code)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="نوع الواجب" required>
              <SelectField
                icon={<Layers3 />}
                value={formState.homeworkTypeId}
                onChange={(event) =>
                  updateForm({
                    homeworkTypeId: event.target.value,
                    templateId: "",
                  })
                }
                disabled={homeworkTypesQuery.isPending}
              >
                <option value="">اختر النوع</option>
                {(homeworkTypesQuery.data ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {formatNameCodeLabel(type.name, type.code)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="القالب">
              <SelectField
                icon={<FileText />}
                value={formState.templateId}
                onChange={(event) => {
                  const template = templates.find(
                    (item) => item.id === event.target.value,
                  );
                  if (template) {
                    applyTemplate(template);
                  } else {
                    updateForm({ templateId: "" });
                  }
                }}
                disabled={templatesQuery.isPending || templates.length === 0}
              >
                <option value="">بدون قالب</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {formatNameCodeLabel(template.name, template.code)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="عنوان الواجب" required className="lg:col-span-2">
              <Input
                icon={<ClipboardCheck />}
                value={formState.title}
                onChange={(event) => updateForm({ title: event.target.value })}
                placeholder="مثال: واجب قراءة وتحليل"
              />
            </FormField>

            <FormField label="تاريخ الواجب" required>
              <Input
                icon={<CalendarClock />}
                type="date"
                value={formState.homeworkDate}
                onChange={(event) => handleHomeworkDateChange(event.target.value)}
              />
            </FormField>

            <FormField label="موعد التسليم">
              <Input
                icon={<Clock3 />}
                type="date"
                value={formState.dueDate}
                onChange={(event) => updateForm({ dueDate: event.target.value })}
              />
            </FormField>

            <FormField label="الدرجة" required>
              <Input
                icon={<GraduationCap />}
                type="number"
                min={0.01}
                step={0.01}
                value={formState.maxScore}
                onChange={(event) => updateForm({ maxScore: event.target.value })}
              />
            </FormField>

            <FormField label="المدة المتوقعة">
              <Input
                icon={<Clock3 />}
                type="number"
                min={1}
                step={1}
                value={formState.estimatedMinutes}
                onChange={(event) =>
                  updateForm({ estimatedMinutes: event.target.value })
                }
              />
            </FormField>

            <FormField label="المستوى">
              <div className="grid grid-cols-3 gap-2">
                {(["FOUNDATION", "BALANCED", "CHALLENGE"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={cn(
                      "h-10 rounded-md border px-3 text-sm font-medium transition-colors",
                      formState.difficulty === level
                        ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                        : "bg-background text-muted-foreground hover:bg-muted/40",
                    )}
                    onClick={() => updateForm({ difficulty: level })}
                  >
                    {getDifficultyLabel(level)}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={generateSmartDraft}
              >
                <Wand2 />
                توليد مسودة
              </Button>
            </div>

            <FormField label="محتوى الواجب" className="lg:col-span-2">
              <TextareaField
                icon={<MessageSquareText />}
                rows={8}
                value={formState.content}
                onChange={(event) => updateForm({ content: event.target.value })}
                placeholder="المطلوب من الطالب..."
              />
            </FormField>

            <FormField label="ملاحظات داخلية" className="lg:col-span-2">
              <TextareaField
                icon={<FileText />}
                rows={3}
                value={formState.notes}
                onChange={(event) => updateForm({ notes: event.target.value })}
                placeholder="ملاحظات للمعلم أو الإدارة"
              />
            </FormField>

            <div className="lg:col-span-2">
              <FormBooleanField
                checked={formState.autoPopulateStudents}
                onCheckedChange={(checked) =>
                  updateForm({ autoPopulateStudents: checked })
                }
                label="إنشاء سجلات الطلاب تلقائيًا"
                description="يربط الواجب بطلاب الشعبة النشطين عند الحفظ."
              />
            </div>
          </div>

          {(formError || mutationError || successMessage) && (
            <div className="border-t p-4">
              {formError || mutationError ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                  {formError ?? mutationError}
                </div>
              ) : null}
              {successMessage ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                  {successMessage}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/55 p-5">
            <div className="flex flex-wrap gap-2">
              {readinessItems.map((item) => (
                <Badge
                  key={item.label}
                  variant="outline"
                  className={cn(
                    "gap-1",
                    item.done
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-muted-foreground/20 text-muted-foreground",
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {item.label}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!canCreate || isSaving}
              >
                {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                إنشاء الواجب
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canCreate || !canApprove || isSaving}
                onClick={() => void handleSubmit("approve")}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 />
                )}
                إنشاء واعتماد
              </Button>
            </div>
          </div>
        </form>

        <aside className="space-y-4">
          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">مؤشرات قبل الحفظ</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    مراجعة سريعة قبل إنشاء الواجب أو اعتماده.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void dashboardQuery.refetch()}
                  disabled={dashboardQuery.isFetching}
                  aria-label="تحديث المؤشرات"
                >
                  <RefreshCw
                    className={cn(dashboardQuery.isFetching && "animate-spin")}
                  />
                </Button>
              </div>

              <div className="grid gap-2">
                {guidanceItems.map((item) => (
                  <div
                    key={`${item.title}-${item.value}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
                      item.tone === "good" &&
                        "border-emerald-500/20 bg-emerald-500/10",
                      item.tone === "warn" &&
                        "border-amber-500/25 bg-amber-500/10",
                      item.tone === "danger" &&
                        "border-rose-500/25 bg-rose-500/10",
                    )}
                  >
                    <span className="text-muted-foreground">{item.title}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricTile
                  label="واجبات النطاق"
                  value={dashboardMetrics?.totalHomeworks ?? 0}
                  icon={<ClipboardCheck />}
                />
                <MetricTile
                  label="متأخرة"
                  value={dashboardMetrics?.overdueHomeworks ?? 0}
                  icon={<AlertTriangle />}
                  danger
                />
                <MetricTile
                  label="قيد المتابعة"
                  value={dashboardMetrics?.pendingStudentRows ?? 0}
                  icon={<UsersRound />}
                />
                <MetricTile
                  label="الإنجاز"
                  value={`${dashboardMetrics?.completionRate ?? 0}%`}
                  icon={<CheckCircle2 />}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">معاينة النشر</h2>
                <Badge variant="outline">{formState.autoPopulateStudents ? "طلاب الشعبة" : "بدون توليد"}</Badge>
              </div>
              <div className="space-y-3 rounded-md border bg-muted/15 p-3 text-sm">
                <PreviewLine label="العنوان" value={formState.title || "-"} />
                <PreviewLine
                  label="النطاق"
                  value={
                    selectedSection
                      ? formatSectionWithGradeLabel(selectedSection)
                      : "-"
                  }
                />
                <PreviewLine
                  label="المادة"
                  value={
                    selectedSubject
                      ? formatNameCodeLabel(selectedSubject.name, selectedSubject.code)
                      : "-"
                  }
                />
                <PreviewLine
                  label="التسليم"
                  value={formState.dueDate ? formatDateLabel(toDateIso(formState.dueDate)) : "-"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">قوالب مناسبة</h2>
                <Badge variant="outline">{templates.length}</Badge>
              </div>
              <div className="grid gap-2">
                {templatesQuery.isPending ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    جاري تحميل القوالب...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    لا توجد قوالب مطابقة.
                  </div>
                ) : (
                  templates.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="rounded-md border bg-background p-3 text-right transition-colors hover:bg-muted/35"
                      onClick={() => applyTemplate(template)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{template.name}</span>
                        <Badge variant="outline">{template.maxScore}</Badge>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {template.title}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>

      {canReadReports ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <ActivityPanel
            title="آخر واجبات في النطاق"
            emptyText="لا توجد واجبات حديثة."
            rows={recentHomeworks.slice(0, 5).map((homework) => ({
              id: homework.id,
              title: homework.title,
              meta: `${formatNameCodeLabel(homework.subject.name, homework.subject.code)} - ${formatDateLabel(homework.homeworkDate)}`,
              badge: `${homework._count.studentHomeworks} طالب`,
              href: "/app/homeworks",
            }))}
          />
          <ActivityPanel
            title="تعثرات تحتاج متابعة"
            emptyText="لا توجد تعثرات واضحة."
            rows={topPendingHomeworks.slice(0, 5).map((homework) => ({
              id: homework.homeworkId,
              title: homework.title,
              meta: `${formatNameCodeLabel(homework.subject.name, homework.subject.code)} - ${formatSectionWithGradeLabel(homework.section)}`,
              badge: `${homework.pendingCount} طالب`,
              href: "/app/homework-entry",
            }))}
            danger
          />
        </section>
      ) : null}
    </div>
  );
}

function Signal({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/25 px-2.5 py-1">
      <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function MetricTile({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background p-3",
        danger && "border-rose-500/25 bg-rose-500/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  );
}

function ActivityPanel({
  title,
  emptyText,
  rows,
  danger,
}: {
  title: string;
  emptyText: string;
  rows: Array<{
    id: string;
    title: string;
    meta: string;
    badge: string;
    href: string;
  }>;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h2 className="font-semibold">{title}</h2>
        <Badge
          variant="outline"
          className={cn(danger && "border-rose-500/25 text-rose-700 dark:text-rose-300")}
        >
          {rows.length}
        </Badge>
      </div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{row.title}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {row.meta}
                </div>
              </div>
              <Badge variant={danger ? "destructive" : "outline"}>{row.badge}</Badge>
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Inbox,
  Medal,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
  Search,
  Send,
  Star,
  UserRoundCheck,
  UsersRound,
  Wand2,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { usePopulateHomeworkStudentsMutation } from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { useHomeworkOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-homework-options-query";
import {
  useBulkUpdateStudentHomeworksMutation,
} from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-mutations";
import { useStudentHomeworksQuery } from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-query";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import type { HomeworkListItem, StudentHomeworkListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";
import { cn } from "@/lib/utils";

type DraftRow = {
  isCompleted: boolean;
  manualScore: string;
  teacherNotes: string;
};

type QueueFilter = "all" | "needs-score" | "missing" | "graded" | "low-score";

const QUICK_FEEDBACK = [
  "عمل جيد",
  "ممتاز ومرتب",
  "يحتاج مراجعة الحل",
  "تأخر في التسليم",
  "يرجى متابعة ولي الأمر",
];

function formatDate(value?: string | null) {
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

function getErrorMessage(error: unknown) {
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير متوقع.";
}

function getStudentSearchText(row: StudentHomeworkListItem) {
  const student = row.studentEnrollment.student;
  return `${student.fullName} ${student.admissionNo ?? ""}`.toLowerCase();
}

function getScorePercent(score: number | null, maxScore: number) {
  if (score === null || maxScore <= 0) {
    return null;
  }

  return Math.round((score / maxScore) * 100);
}

function buildDraft(row: StudentHomeworkListItem): DraftRow {
  return {
    isCompleted: row.isCompleted,
    manualScore: row.manualScore === null ? "" : String(row.manualScore),
    teacherNotes: row.teacherNotes ?? "",
  };
}

function getDraftScore(draft: DraftRow) {
  const score = Number(draft.manualScore);
  return Number.isFinite(score) ? score : null;
}

function getRowStatus(row: StudentHomeworkListItem, draft: DraftRow) {
  const score = getDraftScore(draft);

  if (!draft.isCompleted) {
    return {
      label: "لم يسلم",
      tone: "danger" as const,
    };
  }

  if (score === null) {
    return {
      label: "يحتاج درجة",
      tone: "warn" as const,
    };
  }

  const percent = getScorePercent(score, row.homework.maxScore);

  if (percent !== null && percent < 50) {
    return {
      label: "درجة منخفضة",
      tone: "warn" as const,
    };
  }

  return {
    label: "مصحح",
    tone: "success" as const,
  };
}

function homeworkMatchesSearch(homework: HomeworkListItem, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    homework.title,
    homework.subject.name,
    homework.subject.code,
    homework.section.name,
    homework.section.code,
    homework.section.gradeLevel.name,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function HomeworkSubmissionsWorkspace() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();
  const canRead = hasPermission("student-homeworks.read");
  const canBulkUpdate = hasPermission("student-homeworks.bulk-update");
  const canPopulate = hasPermission("homeworks.populate-students");

  const [sectionId, setSectionId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [homeworkSearch, setHomeworkSearch] = React.useState("");
  const [homeworkId, setHomeworkId] = React.useState("");
  const [studentSearch, setStudentSearch] = React.useState("");
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>("all");
  const [drafts, setDrafts] = React.useState<Record<string, DraftRow>>({});
  const [successMessage, setSuccessMessage] = React.useState("");
  const [bulkNote, setBulkNote] = React.useState("");

  const homeworksQuery = useHomeworkOptionsQuery();
  const homeworks = React.useMemo(
    () => homeworksQuery.data ?? [],
    [homeworksQuery.data],
  );

  const sections = React.useMemo(() => {
    const map = new Map<string, HomeworkListItem["section"]>();
    homeworks.forEach((homework) => {
      map.set(homework.sectionId, homework.section);
    });
    return Array.from(map.values()).sort((left, right) =>
      formatSectionWithGradeLabel(left).localeCompare(
        formatSectionWithGradeLabel(right),
        "ar",
      ),
    );
  }, [homeworks]);

  const subjects = React.useMemo(() => {
    const map = new Map<string, HomeworkListItem["subject"]>();
    homeworks
      .filter((homework) => !sectionId || homework.sectionId === sectionId)
      .forEach((homework) => {
        map.set(homework.subjectId, homework.subject);
      });
    return Array.from(map.values()).sort((left, right) =>
      formatNameCodeLabel(left.name, left.code).localeCompare(
        formatNameCodeLabel(right.name, right.code),
        "ar",
      ),
    );
  }, [homeworks, sectionId]);

  const filteredHomeworks = React.useMemo(
    () =>
      homeworks.filter(
        (homework) =>
          (!sectionId || homework.sectionId === sectionId) &&
          (!subjectId || homework.subjectId === subjectId) &&
          homeworkMatchesSearch(homework, homeworkSearch),
      ),
    [homeworkSearch, homeworks, sectionId, subjectId],
  );

  React.useEffect(() => {
    if (!homeworkId && filteredHomeworks.length > 0) {
      setHomeworkId(filteredHomeworks[0].id);
      return;
    }

    if (
      homeworkId &&
      !filteredHomeworks.some((homework) => homework.id === homeworkId)
    ) {
      setHomeworkId(filteredHomeworks[0]?.id ?? "");
    }
  }, [filteredHomeworks, homeworkId]);

  const selectedHomework = React.useMemo(
    () => homeworks.find((homework) => homework.id === homeworkId) ?? null,
    [homeworkId, homeworks],
  );

  const rowsQuery = useStudentHomeworksQuery({
    page: 1,
    limit: 300,
    homeworkId: homeworkId || undefined,
    isActive: true,
  });
  const rows = React.useMemo(
    () => rowsQuery.data?.data ?? [],
    [rowsQuery.data?.data],
  );

  React.useEffect(() => {
    const nextDrafts: Record<string, DraftRow> = {};
    rows.forEach((row) => {
      nextDrafts[row.id] = buildDraft(row);
    });
    setDrafts(nextDrafts);
    setSuccessMessage("");
    setBulkNote("");
  }, [rows]);

  const stats = React.useMemo(() => {
    let submitted = 0;
    let missing = 0;
    let needsScore = 0;
    let graded = 0;
    let lowScore = 0;

    rows.forEach((row) => {
      const draft = drafts[row.id] ?? buildDraft(row);
      const score = getDraftScore(draft);
      const percent = getScorePercent(score, row.homework.maxScore);

      if (draft.isCompleted) {
        submitted += 1;
        if (score === null) {
          needsScore += 1;
        } else {
          graded += 1;
          if (percent !== null && percent < 50) {
            lowScore += 1;
          }
        }
      } else {
        missing += 1;
      }
    });

    const completionRate =
      rows.length > 0 ? Math.round((submitted / rows.length) * 100) : 0;

    return {
      total: rows.length,
      submitted,
      missing,
      needsScore,
      graded,
      lowScore,
      completionRate,
    };
  }, [drafts, rows]);

  const visibleRows = React.useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();

    return rows.filter((row) => {
      const draft = drafts[row.id] ?? buildDraft(row);
      const score = getDraftScore(draft);
      const percent = getScorePercent(score, row.homework.maxScore);
      const matchesSearch =
        !normalizedSearch || getStudentSearchText(row).includes(normalizedSearch);
      const matchesFilter =
        queueFilter === "all" ||
        (queueFilter === "needs-score" && draft.isCompleted && score === null) ||
        (queueFilter === "missing" && !draft.isCompleted) ||
        (queueFilter === "graded" && draft.isCompleted && score !== null) ||
        (queueFilter === "low-score" &&
          draft.isCompleted &&
          percent !== null &&
          percent < 50);

      return matchesSearch && matchesFilter;
    });
  }, [drafts, queueFilter, rows, studentSearch]);

  const bulkUpdateMutation = useBulkUpdateStudentHomeworksMutation();
  const populateMutation = usePopulateHomeworkStudentsMutation();
  const isLocked = Boolean(selectedHomework?.isLocked);
  const isBusy =
    rowsQuery.isFetching || bulkUpdateMutation.isPending || populateMutation.isPending;
  const errorMessage =
    getErrorMessage(rowsQuery.error) ||
    getErrorMessage(bulkUpdateMutation.error) ||
    getErrorMessage(populateMutation.error);

  function updateDraft(rowId: string, patch: Partial<DraftRow>) {
    setSuccessMessage("");
    setDrafts((current) => ({
      ...current,
      [rowId]: {
        ...(current[rowId] ?? {
          isCompleted: false,
          manualScore: "",
          teacherNotes: "",
        }),
        ...patch,
      },
    }));
  }

  function applyBulkScore(mode: "full" | "zero" | "clear") {
    if (!selectedHomework) {
      return;
    }

    setSuccessMessage("");
    setDrafts((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        const existing = next[row.id] ?? buildDraft(row);
        next[row.id] = {
          ...existing,
          isCompleted: mode !== "zero",
          manualScore:
            mode === "full"
              ? String(selectedHomework.maxScore)
              : mode === "zero"
                ? ""
                : "",
        };
      });
      return next;
    });
  }

  function applyBulkNoteToVisibleRows() {
    const note = bulkNote.trim();
    if (!note) {
      return;
    }

    setSuccessMessage("");
    setDrafts((current) => {
      const next = { ...current };
      visibleRows.forEach((row) => {
        const existing = next[row.id] ?? buildDraft(row);
        next[row.id] = {
          ...existing,
          teacherNotes: note,
        };
      });
      return next;
    });
  }

  async function handlePopulateStudents() {
    if (!homeworkId) {
      return;
    }

    setSuccessMessage("");
    const result = await populateMutation.mutateAsync(homeworkId);
    await queryClient.invalidateQueries({
      queryKey: ["student-homeworks", "list"],
    });
    await rowsQuery.refetch();
    setSuccessMessage(
      `تم تجهيز ${result.insertedCount} سجل جديد واستعادة ${result.restoredCount} سجل سابق.`,
    );
  }

  async function handleSave() {
    if (!homeworkId || rows.length === 0) {
      return;
    }

    setSuccessMessage("");
    const result = await bulkUpdateMutation.mutateAsync({
      homeworkId,
      items: rows.map((row) => {
        const draft = drafts[row.id] ?? buildDraft(row);
        const score = draft.manualScore.trim();

        return {
          studentHomeworkId: row.id,
          isCompleted: draft.isCompleted,
          manualScore: draft.isCompleted && score ? Number(score) : undefined,
          teacherNotes: draft.teacherNotes.trim() || undefined,
        };
      }),
    });

    setSuccessMessage(
      `تم حفظ ${result.summary.total} سجل: ${result.summary.completed} مسلم، ${result.summary.pending} غير مسلم.`,
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Inbox className="h-3.5 w-3.5" />
              صندوق التسليمات
            </div>
            <h1 className="text-2xl font-semibold">التسليمات والتصحيح</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/homework-studio">
                <Wand2 />
                الاستوديو
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-entry">
                <ClipboardCheck />
                إدخال سريع
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
                المعايير
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void rowsQuery.refetch()}
              disabled={!homeworkId || isBusy}
            >
              <RefreshCw className={cn(isBusy && "animate-spin")} />
              تحديث
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canBulkUpdate || isLocked || rows.length === 0 || isBusy}
            >
              {bulkUpdateMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
              حفظ التصحيح
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-lg border bg-background">
            <div className="border-b p-4">
              <h2 className="font-semibold">اختيار الواجب</h2>
            </div>
            <div className="space-y-3 p-4">
              <SelectField
                icon={<UsersRound />}
                value={sectionId}
                onChange={(event) => {
                  setSectionId(event.target.value);
                  setSubjectId("");
                  setHomeworkId("");
                }}
              >
                <option value="">كل الشعب</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {formatSectionWithGradeLabel(section)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                icon={<BookOpenCheck />}
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setHomeworkId("");
                }}
              >
                <option value="">كل المواد</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {formatNameCodeLabel(subject.name, subject.code)}
                  </option>
                ))}
              </SelectField>
              <Input
                icon={<Search />}
                value={homeworkSearch}
                onChange={(event) => setHomeworkSearch(event.target.value)}
                placeholder="بحث في الواجبات"
              />
            </div>
            <div className="max-h-[520px] space-y-2 overflow-auto border-t p-3">
              {homeworksQuery.isPending ? (
                <LoadingBlock text="جاري تحميل الواجبات..." />
              ) : filteredHomeworks.length === 0 ? (
                <EmptyBlock text="لا توجد واجبات مطابقة." />
              ) : (
                filteredHomeworks.map((homework) => (
                  <button
                    key={homework.id}
                    type="button"
                    className={cn(
                      "w-full rounded-md border p-3 text-right transition-colors",
                      homework.id === homeworkId
                        ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]"
                        : "bg-background hover:bg-muted/35",
                    )}
                    onClick={() => setHomeworkId(homework.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 font-medium">{homework.title}</span>
                      <Badge variant="outline">{homework.maxScore}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatNameCodeLabel(homework.subject.name, homework.subject.code)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatSectionWithGradeLabel(homework.section)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <section className="rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0">
                {selectedHomework ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{selectedHomework.homeworkType.name}</Badge>
                      <Badge variant={isLocked ? "destructive" : "outline"}>
                        {isLocked ? "مقفل" : "قابل للتعديل"}
                      </Badge>
                    </div>
                    <h2 className="truncate text-xl font-semibold">
                      {selectedHomework.title}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Signal
                        icon={<UsersRound />}
                        label={formatSectionWithGradeLabel(selectedHomework.section)}
                      />
                      <Signal
                        icon={<BookOpenCheck />}
                        label={formatNameCodeLabel(
                          selectedHomework.subject.name,
                          selectedHomework.subject.code,
                        )}
                      />
                      <Signal
                        icon={<Clock3 />}
                        label={`التسليم ${formatDate(selectedHomework.dueDate)}`}
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyBlock text="اختر واجبا من القائمة." />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric label="الطلاب" value={stats.total} icon={<UsersRound />} />
                <MiniMetric label="مسلم" value={stats.submitted} icon={<Send />} />
                <MiniMetric label="يحتاج درجة" value={stats.needsScore} icon={<FileCheck2 />} />
                <MiniMetric label="الإنجاز" value={`${stats.completionRate}%`} icon={<CheckCircle2 />} />
              </div>
            </div>
            <div className="grid gap-2 border-t p-4 md:grid-cols-5">
              <QueueButton
                active={queueFilter === "all"}
                label="الكل"
                value={stats.total}
                onClick={() => setQueueFilter("all")}
              />
              <QueueButton
                active={queueFilter === "needs-score"}
                label="يحتاج درجة"
                value={stats.needsScore}
                onClick={() => setQueueFilter("needs-score")}
              />
              <QueueButton
                active={queueFilter === "missing"}
                label="لم يسلم"
                value={stats.missing}
                onClick={() => setQueueFilter("missing")}
              />
              <QueueButton
                active={queueFilter === "graded"}
                label="مصحح"
                value={stats.graded}
                onClick={() => setQueueFilter("graded")}
              />
              <QueueButton
                active={queueFilter === "low-score"}
                label="منخفض"
                value={stats.lowScore}
                onClick={() => setQueueFilter("low-score")}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
            <div className="grid gap-3 border-b p-4 lg:grid-cols-[1fr_260px_auto]">
              <Input
                icon={<Search />}
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="بحث باسم الطالب أو رقم القيد"
              />
              <TextareaField
                icon={<MessageSquareText />}
                rows={1}
                value={bulkNote}
                onChange={(event) => setBulkNote(event.target.value)}
                placeholder="ملاحظة جماعية"
                className="min-h-10"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyBulkNoteToVisibleRows}
                  disabled={!canBulkUpdate || isLocked || visibleRows.length === 0}
                >
                  <MessageSquareText />
                  تطبيق
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyBulkScore("full")}
                  disabled={!canBulkUpdate || isLocked || rows.length === 0}
                >
                  <Star />
                  كاملة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyBulkScore("zero")}
                  disabled={!canBulkUpdate || isLocked || rows.length === 0}
                >
                  <X />
                  لم يسلم
                </Button>
              </div>
            </div>

            {successMessage ? (
              <div className="mx-4 mt-4 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <div className="p-4">
              {!canRead ? (
                <EmptyBlock text="لا تملك صلاحية قراءة سجلات واجبات الطلاب." />
              ) : homeworksQuery.isPending || (rowsQuery.isPending && homeworkId) ? (
                <LoadingBlock text="جاري تحميل صندوق التسليمات..." />
              ) : !homeworkId ? (
                <EmptyBlock text="اختر واجبا من القائمة لعرض الطلاب." />
              ) : rows.length === 0 ? (
                <div className="space-y-3">
                  <EmptyBlock text="لا توجد سجلات طلاب لهذا الواجب." />
                  <Button
                    type="button"
                    onClick={() => void handlePopulateStudents()}
                    disabled={!canPopulate || isLocked || populateMutation.isPending}
                  >
                    {populateMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <UserRoundCheck />
                    )}
                    تجهيز سجلات الطلاب
                  </Button>
                </div>
              ) : visibleRows.length === 0 ? (
                <EmptyBlock text="لا توجد سجلات مطابقة للفلتر الحالي." />
              ) : (
                <div className="grid gap-3">
                  {visibleRows.map((row) => (
                    <SubmissionRow
                      key={row.id}
                      row={row}
                      draft={drafts[row.id] ?? buildDraft(row)}
                      canUpdate={canBulkUpdate && !isLocked}
                      onChange={(patch) => updateDraft(row.id, patch)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}

function Signal({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/25 px-2.5 py-1">
      <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function MiniMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-muted/15 p-3">
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

function QueueButton({
  active,
  label,
  value,
  onClick,
}: {
  active: boolean;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-11 items-center justify-between rounded-md border px-3 text-sm transition-colors",
        active
          ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
          : "bg-background text-muted-foreground hover:bg-muted/35",
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </button>
  );
}

function SubmissionRow({
  row,
  draft,
  canUpdate,
  onChange,
}: {
  row: StudentHomeworkListItem;
  draft: DraftRow;
  canUpdate: boolean;
  onChange: (patch: Partial<DraftRow>) => void;
}) {
  const student = row.studentEnrollment.student;
  const status = getRowStatus(row, draft);
  const score = getDraftScore(draft);
  const percent = getScorePercent(score, row.homework.maxScore);

  return (
    <Card className="rounded-[22px] border-border/60 bg-background/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
      <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{student.fullName}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                رقم القيد: {student.admissionNo ?? "-"} -{" "}
                {formatSectionWithGradeLabel(row.studentEnrollment.section)}
              </div>
            </div>
            <Badge
              className={cn(
                status.tone === "success" &&
                  "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                status.tone === "warn" &&
                  "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                status.tone === "danger" &&
                  "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
              )}
              variant="outline"
            >
              {status.label}
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              size="sm"
              variant={draft.isCompleted ? "default" : "outline"}
              onClick={() =>
                onChange({
                  isCompleted: true,
                  manualScore: draft.manualScore,
                })
              }
              disabled={!canUpdate}
            >
              <Send />
              مسلم
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!draft.isCompleted ? "default" : "outline"}
              onClick={() =>
                onChange({
                  isCompleted: false,
                  manualScore: "",
                })
              }
              disabled={!canUpdate}
            >
              <X />
              لم يسلم
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  isCompleted: true,
                  manualScore: String(row.homework.maxScore),
                })
              }
              disabled={!canUpdate}
            >
              <Star />
              كاملة
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_FEEDBACK.map((note) => (
              <button
                key={note}
                type="button"
                className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
                disabled={!canUpdate}
                onClick={() => onChange({ teacherNotes: note })}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[110px_1fr] xl:grid-cols-1">
          <label className="space-y-1 text-xs font-medium">
            <span>الدرجة</span>
            <Input
              type="number"
              min={0}
              max={row.homework.maxScore}
              step="0.25"
              value={draft.manualScore}
              onChange={(event) => onChange({ manualScore: event.target.value })}
              disabled={!canUpdate || !draft.isCompleted}
              placeholder={`من ${row.homework.maxScore}`}
              icon={<ClipboardCheck />}
            />
          </label>
          <label className="space-y-1 text-xs font-medium">
            <span>ملاحظة المعلم</span>
            <TextareaField
              rows={2}
              value={draft.teacherNotes}
              onChange={(event) => onChange({ teacherNotes: event.target.value })}
              disabled={!canUpdate}
              placeholder="اكتب ملاحظة قصيرة"
              icon={<MessageSquareText />}
            />
          </label>
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/15 px-3 py-2 text-xs">
            <span className="text-muted-foreground">النسبة</span>
            <span className="font-semibold">
              {percent === null ? "-" : `${percent}%`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed bg-muted/15 p-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
